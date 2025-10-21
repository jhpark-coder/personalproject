package backend.fitmate.domain.notification.service;

import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.workout.entity.WorkoutSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import backend.fitmate.domain.user.repository.UserRepository;
import backend.fitmate.domain.workout.repository.WorkoutSessionRepository;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;

/**
 * 알림 관리 서비스
 * - 운동 완료 알림
 * - 일일 운동 리마인더
 * - 주간 운동 요약
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {
    
    private final UserRepository userRepository;
    private final WorkoutSessionRepository workoutSessionRepository;
    private final RestTemplate restTemplate;
    
    // @Autowired(required = false)
    // private WebSocketNotificationClient webSocketClient;
    
    /**
     * 운동 완료 알림 발송 (분석 결과 포함)
     */
    @Async
    public void sendWorkoutCompletionNotification(User user, WorkoutSession session, Map<String, Object> analysisResult) {
        try {
            log.info("운동 완료 알림 발송 - userId: {}, sessionId: {}", 
                user.getId(), session.getId());
            
            // 분석 결과 추출
            Map<String, Object> analysis = (Map<String, Object>) analysisResult.get("analysis");
            String grade = analysis != null ? (String) analysis.get("grade") : "B";
            String completionRate = analysis != null ? (String) analysis.get("completionRate") : "100%";
            List<String> improvements = analysis != null ? (List<String>) analysis.get("improvements") : new ArrayList<>();
            List<String> recommendations = analysis != null ? (List<String>) analysis.get("nextRecommendations") : new ArrayList<>();
            
            // 알림 메시지 구성
            StringBuilder messageBuilder = new StringBuilder();
            messageBuilder.append(String.format("🏆 등급: %s | 완료율: %s\n", grade, completionRate));
            messageBuilder.append(String.format("⏱️ %d분 운동 | 🔥 %.0fkcal 소모\n", 
                session.getActualDuration(), session.getCaloriesBurned()));
            
            if (!improvements.isEmpty()) {
                messageBuilder.append("\n💡 개선 포인트:\n");
                improvements.forEach(imp -> messageBuilder.append("• ").append(imp).append("\n"));
            }
            
            if (!recommendations.isEmpty()) {
                messageBuilder.append("\n🎯 다음 추천:\n");
                recommendations.forEach(rec -> messageBuilder.append("• ").append(rec).append("\n"));
            }
            
            // WebSocket을 통한 실시간 알림 (communication-server와 연동)
            Map<String, Object> notification = new HashMap<>();
            notification.put("type", "WORKOUT_COMPLETED");
            notification.put("userId", user.getId());
            notification.put("title", "🎉 운동 완료 & 분석 결과");
            notification.put("message", messageBuilder.toString());
            notification.put("grade", grade);
            notification.put("completionRate", completionRate);
            notification.put("timestamp", LocalDateTime.now());
            notification.put("link", "/workout/summary/" + session.getId());
            
            // WebSocket 클라이언트를 통해 communication-server로 알림 전송
            // if (webSocketClient != null) {
            //     webSocketClient.sendNotification(notification);
            // }
            
            log.info("운동 완료 알림 발송 완료 (분석 결과 포함)");
        } catch (Exception e) {
            log.error("운동 완료 알림 발송 실패", e);
        }
    }
    
    /**
     * 운동 완료 알림 발송 (기존 메서드 - 하위 호환성)
     */
    @Async
    public void sendWorkoutCompletionNotification(User user, WorkoutSession session) {
        sendWorkoutCompletionNotification(user, session, new HashMap<>());
    }
    
    /**
     * 매일 오전 9시 운동 리마인더 발송
     * 전날 운동 기록을 기반으로 오늘의 추천 운동 발송
     */
    @Scheduled(cron = "0 0 9 * * *")
    @Transactional(readOnly = true)
    public void sendDailyWorkoutReminder() {
        log.info("일일 운동 리마인더 시작");
        
        try {
            // 활성 사용자 조회 - User 엔티티에 isActive 필드가 없으므로 모든 사용자 조회
            // 실제 프로덕션에서는 reminderEnabled 필드를 확인하여 필터링
            List<User> activeUsers = userRepository.findAll().stream()
                .filter(user -> user.getReminderEnabled() != null && user.getReminderEnabled())
                .collect(java.util.stream.Collectors.toList());
            
            for (User user : activeUsers) {
                // 전날 운동 기록 조회
                LocalDateTime yesterday = LocalDateTime.now().minusDays(1);
                List<WorkoutSession> yesterdayWorkouts = workoutSessionRepository
                    .findByUserAndSessionDateBetween(user, 
                        yesterday.withHour(0).withMinute(0),
                        yesterday.withHour(23).withMinute(59));
                
                // 운동 추천 생성
                String recommendation = generateWorkoutRecommendation(user, yesterdayWorkouts);
                
                // SMS 발송 요청 (communication-server로 위임)
                if (user.getPhoneNumber() != null && !user.getPhoneNumber().isEmpty()) {
                    sendSMSNotification(user, recommendation);
                }
            }
            
            log.info("일일 운동 리마인더 완료 - {} 명에게 발송", activeUsers.size());
        } catch (Exception e) {
            log.error("일일 운동 리마인더 발송 실패", e);
        }
    }
    
    /**
     * 운동 추천 메시지 생성
     */
    private String generateWorkoutRecommendation(User user, List<WorkoutSession> previousWorkouts) {
        StringBuilder message = new StringBuilder();
        message.append("🏋️ FitMate 오늘의 운동 추천\n\n");
        message.append("안녕하세요 ").append(user.getName()).append("님!\n");
        
        if (previousWorkouts.isEmpty()) {
            // 전날 운동을 하지 않은 경우
            message.append("오늘은 가벼운 스트레칭과 함께 시작해보세요!\n");
            message.append("추천: 스쿼트 3세트, 푸시업 3세트");
        } else {
            // 전날 운동 기록이 있는 경우
            WorkoutSession lastSession = previousWorkouts.get(previousWorkouts.size() - 1);
            message.append("어제 ").append(lastSession.getActualDuration()).append("분 운동하셨네요!\n");
            
            // 운동 강도에 따른 추천
            if (lastSession.getActualDuration() < 30) {
                message.append("오늘은 조금 더 길게 도전해보세요!\n");
                message.append("추천: 전신 운동 40분");
            } else {
                message.append("꾸준히 운동하고 계시네요! 💪\n");
                message.append("추천: 하체 집중 운동 30분");
            }
        }
        
        message.append("\n\nFitMate 앱에서 자세한 운동 가이드를 확인하세요!");
        
        return message.toString();
    }
    
    /**
     * SMS 발송 요청 (communication-server로 위임)
     */
    private void sendSMSNotification(User user, String message) {
        try {
            Map<String, Object> smsRequest = new HashMap<>();
            smsRequest.put("to", user.getPhoneNumber());
            smsRequest.put("message", message);
            smsRequest.put("userId", user.getId());
            
            // Communication Server로 SMS 발송 요청
            String smsServerUrl = System.getenv("SMS_SERVER_URL");
            if (smsServerUrl == null || smsServerUrl.isEmpty()) {
                smsServerUrl = "http://localhost:3000";  // 기본값
            }
            
            try {
                String response = restTemplate.postForObject(
                    smsServerUrl + "/sms/send", 
                    smsRequest, 
                    String.class
                );
                log.info("SMS 발송 성공 - userId: {}, phone: {}, response: {}", 
                    user.getId(), user.getPhoneNumber(), response);
            } catch (Exception e) {
                log.error("SMS 발송 실패 (서버 연결 실패) - userId: {}, error: {}", 
                    user.getId(), e.getMessage());
                // SMS 실패해도 시스템은 계속 작동
            }
            
        } catch (Exception e) {
            log.error("SMS 발송 요청 처리 실패 - userId: " + user.getId(), e);
        }
    }
    
    /**
     * 주간 운동 요약 발송 (매주 일요일 저녁 8시)
     */
    @Scheduled(cron = "0 0 20 * * SUN")
    @Transactional(readOnly = true)
    public void sendWeeklySummary() {
        log.info("주간 운동 요약 시작");
        
        try {
            List<User> activeUsers = userRepository.findAll().stream()
                .filter(user -> user.getReminderEnabled() != null && user.getReminderEnabled())
                .collect(java.util.stream.Collectors.toList());
            
            for (User user : activeUsers) {
                // 지난 주 운동 기록 조회
                LocalDateTime weekStart = LocalDateTime.now().minusDays(7);
                List<WorkoutSession> weeklyWorkouts = workoutSessionRepository
                    .findByUserAndSessionDateAfter(user, weekStart);
                
                if (!weeklyWorkouts.isEmpty()) {
                    // 주간 통계 계산
                    int totalMinutes = weeklyWorkouts.stream()
                        .mapToInt(WorkoutSession::getActualDuration)
                        .sum();
                    double totalCalories = weeklyWorkouts.stream()
                        .mapToDouble(s -> s.getCaloriesBurned().doubleValue())
                        .sum();
                    
                    String summary = String.format(
                        "📊 주간 운동 요약\n\n" +
                        "%s님의 이번 주 성과:\n" +
                        "• 운동 횟수: %d회\n" +
                        "• 총 운동 시간: %d분\n" +
                        "• 소모 칼로리: %.0f kcal\n\n" +
                        "다음 주도 화이팅! 💪",
                        user.getName(),
                        weeklyWorkouts.size(),
                        totalMinutes,
                        totalCalories
                    );
                    
                    // 이메일 또는 푸시 알림으로 발송
                    sendWeeklySummaryNotification(user, summary);
                }
            }
            
            log.info("주간 운동 요약 완료");
        } catch (Exception e) {
            log.error("주간 운동 요약 발송 실패", e);
        }
    }
    
    private void sendWeeklySummaryNotification(User user, String summary) {
        // WebSocket을 통한 알림 발송
        Map<String, Object> notification = new HashMap<>();
        notification.put("type", "WEEKLY_SUMMARY");
        notification.put("userId", user.getId());
        notification.put("title", "📊 주간 운동 요약");
        notification.put("message", summary);
        notification.put("timestamp", LocalDateTime.now());
        
        // WebSocket 클라이언트를 통해 발송
        // if (webSocketClient != null) {
        //     webSocketClient.sendNotification(notification);
        // }
        log.info("주간 요약 발송 - userId: {}", user.getId());
    }
}