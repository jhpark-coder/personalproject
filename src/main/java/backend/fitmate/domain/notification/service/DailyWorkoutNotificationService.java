package backend.fitmate.domain.notification.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutSession;
import backend.fitmate.domain.user.repository.UserRepository;
import backend.fitmate.domain.workout.repository.WorkoutSessionRepository;
import lombok.extern.slf4j.Slf4j;
import backend.fitmate.domain.workout.service.HybridWorkoutRecommendationService;

/**
 * 매일 오전 9시 운동 추천 알림 서비스
 */
@Service
@Slf4j
public class DailyWorkoutNotificationService {

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;
    
    @Autowired
    private HybridWorkoutRecommendationService recommendationService;
    
    @Autowired
    private RestTemplate restTemplate;
    
    @Value("${communication.server.url:http://localhost:3000}")
    private String communicationServerUrl;
    
    /**
     * 매 시간마다 해당 시간에 리마인더 설정된 사용자에게 알림 발송
     * cron: 초 분 시 일 월 요일
     * "0 0 * * * *" = 매시 정각
     */
    @Scheduled(cron = "0 0 * * * *")
    public void sendHourlyWorkoutRecommendations() {
        // 현재 시간 (HH:00 형식)
        java.time.LocalTime now = java.time.LocalTime.now();
        String currentTime = String.format("%02d:00", now.getHour());
        
        // 현재 요일 (Mon, Tue, Wed, Thu, Fri, Sat, Sun)
        String currentDay = java.time.LocalDate.now().getDayOfWeek()
            .getDisplayName(java.time.format.TextStyle.SHORT, java.util.Locale.ENGLISH);
        
        log.info("==== {} {} 운동 추천 알림 시작 ====", currentTime, currentDay);
        
        try {
            // 현재 시간과 요일에 리마인더가 설정된 활성 사용자 조회
            List<User> activeUsers = userRepository.findAll().stream()
                .filter(user -> {
                    // 리마인더가 활성화되어 있는지 확인
                    if (user.getReminderEnabled() == null || !user.getReminderEnabled()) {
                        return false;
                    }
                    
                    // 시간이 일치하는지 확인 (분 단위는 무시하고 시간만 비교)
                    String userTime = user.getReminderTime();
                    if (userTime == null || !userTime.startsWith(currentTime.substring(0, 2))) {
                        return false;
                    }
                    
                    // 요일이 포함되어 있는지 확인
                    String userDays = user.getReminderDays();
                    if (userDays == null || !userDays.contains(currentDay)) {
                        return false;
                    }
                    
                    return true;
                })
                .collect(java.util.stream.Collectors.toList());
                
            log.info("현재 시간({})에 리마인더 설정된 사용자 수: {}", currentTime, activeUsers.size());
            
            int successCount = 0;
            int failCount = 0;
            
            for (User user : activeUsers) {
                try {
                    // 사용자별 알림 발송
                    sendUserNotification(user);
                    successCount++;
                } catch (Exception e) {
                    log.error("사용자 {} 알림 발송 실패: {}", user.getId(), e.getMessage());
                    failCount++;
                }
            }
            
            log.info("알림 발송 완료 - 성공: {}, 실패: {}", successCount, failCount);
            
        } catch (Exception e) {
            log.error("매일 운동 추천 알림 처리 중 오류: ", e);
        }
    }
    
    /**
     * 테스트용 - 수동 실행 메서드
     */
    public void sendTestNotification(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다: " + userId));
        
        sendUserNotification(user);
        log.info("테스트 알림 발송 완료 - userId: {}", userId);
    }
    
    /**
     * 개별 사용자에게 알림 발송
     */
    private void sendUserNotification(User user) {
        // 1. 최근 운동 이력 조회 (7일간)
        LocalDateTime weekAgo = LocalDateTime.now().minusDays(7);
        List<WorkoutSession> recentSessions = workoutSessionRepository
            .findByUserAndSessionDateAfterOrderBySessionDateDesc(user, weekAgo);
        
        // 2. 운동 추천 생성
        Map<String, Object> userData = buildUserData(user, recentSessions);
        Map<String, Object> recommendation = recommendationService.generateRecommendation(userData);
        
        // 3. 메시지 생성
        String message = buildNotificationMessage(user, recommendation, recentSessions);
        
        // 4. SMS 발송 (Communication Server 연동)
        if (user.getPhoneNumber() != null && !user.getPhoneNumber().isEmpty()) {
            sendSMS(user.getPhoneNumber(), message);
        }
        
        // 5. 웹 푸시 알림 발송
        sendWebPushNotification(user, message);
        
        log.info("사용자 {} 알림 발송 완료", user.getId());
    }
    
    /**
     * 사용자 데이터 구성
     */
    private Map<String, Object> buildUserData(User user, List<WorkoutSession> recentSessions) {
        Map<String, Object> userData = new HashMap<>();
        
        // 기본 정보
        userData.put("userId", user.getId());
        userData.put("goal", user.getGoal());
        userData.put("experience", user.getExperience());
        userData.put("height", user.getHeight());
        userData.put("weight", user.getWeight());
        userData.put("age", user.getAge());
        userData.put("gender", user.getGender());
        
        // 최근 운동 통계
        if (!recentSessions.isEmpty()) {
            userData.put("lastWorkoutDays", 
                java.time.temporal.ChronoUnit.DAYS.between(
                    recentSessions.get(0).getSessionDate(), 
                    LocalDateTime.now()
                )
            );
            userData.put("weeklyWorkoutCount", recentSessions.size());
        } else {
            userData.put("lastWorkoutDays", 999);
            userData.put("weeklyWorkoutCount", 0);
        }
        
        return userData;
    }
    
    /**
     * 알림 메시지 생성
     */
    private String buildNotificationMessage(User user, Map<String, Object> recommendation, 
            List<WorkoutSession> recentSessions) {
        
        StringBuilder message = new StringBuilder();
        
        // 인사말
        message.append("안녕하세요 ").append(user.getName()).append("님! 💪\n\n");
        
        // 운동 이력 기반 메시지
        if (recentSessions.isEmpty()) {
            message.append("오랜만에 운동을 시작해보세요!\n");
        } else if (recentSessions.size() >= 3) {
            message.append("이번 주도 꾸준히 운동하고 계시네요! 👍\n");
        } else {
            message.append("오늘도 건강한 하루를 위해 운동해보세요!\n");
        }
        
        // 오늘의 추천 운동
        message.append("\n📋 오늘의 추천 운동:\n");
        
        @SuppressWarnings("unchecked")
        Map<String, Object> workoutPlan = (Map<String, Object>) recommendation.get("workoutPlan");
        if (workoutPlan != null) {
            @SuppressWarnings("unchecked")
            Map<String, Object> mainWorkout = (Map<String, Object>) workoutPlan.get("main");
            if (mainWorkout != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> exercises = (List<Map<String, Object>>) mainWorkout.get("exercises");
                
                if (exercises != null && !exercises.isEmpty()) {
                    // 상위 3개 운동만 표시
                    int count = 0;
                    for (Map<String, Object> exercise : exercises) {
                        if (count >= 3) break;
                        message.append("• ").append(exercise.get("name"))
                              .append(" ").append(exercise.get("sets"))
                              .append("세트 x ").append(exercise.get("reps"))
                              .append("회\n");
                        count++;
                    }
                }
            }
        }
        
        // 마무리
        message.append("\n지금 FitMate에서 시작하세요! 🏃‍♂️");
        
        return message.toString();
    }
    
    /**
     * SMS 발송 (Communication Server 연동)
     */
    private void sendSMS(String phoneNumber, String message) {
        try {
            String url = communicationServerUrl + "/sms/send";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            Map<String, Object> request = new HashMap<>();
            request.put("to", phoneNumber);
            request.put("message", message);
            
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.exchange(
                url,
                HttpMethod.POST,
                entity,
                Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("SMS 발송 성공: {}", phoneNumber);
            } else {
                log.error("SMS 발송 실패: {}", response.getBody());
            }
            
        } catch (Exception e) {
            log.error("SMS 발송 중 오류: {}", e.getMessage());
        }
    }
    
    /**
     * 웹 푸시 알림 발송
     */
    private void sendWebPushNotification(User user, String message) {
        try {
            // 푸시 알림 기능 추후 구현
            // if (notificationService != null) {
            //     notificationService.sendPushNotification(
            //         user.getId(),
            //         "오늘의 운동 추천 🏃‍♂️",
            //         message.substring(0, Math.min(message.length(), 100)) + "..."
            //     );
            // }
            log.info("푸시 알림 발송 예정: userId={}, message={}", user.getId(), message);
        } catch (Exception e) {
            log.error("웹 푸시 알림 발송 실패: {}", e.getMessage());
        }
    }
    
    @Autowired(required = false)
    private NotificationService notificationService;
}