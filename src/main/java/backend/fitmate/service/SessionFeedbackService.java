package backend.fitmate.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import backend.fitmate.User.entity.ExerciseExecution;
import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.UserExercisePreference;
import backend.fitmate.User.entity.WorkoutSession;
import backend.fitmate.User.repository.ExerciseExecutionRepository;
import backend.fitmate.User.repository.SessionFeedbackRepository;
import backend.fitmate.User.repository.UserExercisePreferenceRepository;
import backend.fitmate.User.repository.WorkoutSessionRepository;
import backend.fitmate.dto.SessionFeedbackRequest;
import lombok.extern.slf4j.Slf4j;

/**
 * 세션 피드백 처리 서비스
 * 피드백 저장과 동시에 사용자 프로필 및 운동 선호도를 업데이트
 */
@Service
@Slf4j
@Transactional
public class SessionFeedbackService {
    
    @Autowired
    private WorkoutSessionRepository sessionRepository;
    
    @Autowired
    private SessionFeedbackRepository feedbackRepository;
    
    @Autowired
    private ExerciseExecutionRepository executionRepository;
    
    @Autowired
    private UserExercisePreferenceRepository preferenceRepository;
    
    @Autowired
    private UserExercisePreferenceService preferenceService;

    @Autowired
    private RestTemplate restTemplate;

    @Value("${COMMUNICATION_SERVER_URL:http://localhost:4000}")
    private String communicationServerUrl;

    @Autowired
    private CalendarService calendarService;
    
    /**
     * 운동 세션 시작
     */
    public WorkoutSession startSession(User user, String goal, Integer plannedDuration) {
        log.info("운동 세션 시작: userId={}, goal={}", user.getId(), goal);
        
        WorkoutSession session = WorkoutSession.builder()
                .user(user)
                .goal(goal)
                .plannedDuration(plannedDuration)
                .build();
        
        return sessionRepository.save(session);
    }
    
    /**
     * 운동 세션 완료 및 피드백 저장
     */
    public SessionFeedback saveFeedback(Long sessionId, SessionFeedbackRequest request, Integer actualDuration) {
        log.info("피드백 저장 시작: sessionId={}", sessionId);
        
        WorkoutSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("세션을 찾을 수 없습니다: " + sessionId));
        
        // 세션 실제 소요 시간 업데이트
        if (actualDuration != null) {
            session.setActualDuration(actualDuration);
            sessionRepository.save(session);
        }
        
        // 개별 운동 실행 기록 저장
        if (request.getExerciseFeedbacks() != null) {
            for (SessionFeedbackRequest.ExerciseFeedbackRequest exerciseFeedback : request.getExerciseFeedbacks()) {
                saveExerciseExecution(session, exerciseFeedback);
            }
        }
        
        // 세션 전체 피드백 저장
        SessionFeedback feedback = SessionFeedback.builder()
                .session(session)
                .completionRate(request.getCompletionRate())
                .overallDifficulty(request.getOverallDifficulty())
                .satisfaction(request.getSatisfaction())
                .energyAfter(request.getEnergyAfter())
                .muscleSoreness(request.getMuscleSoreness())
                .wouldRepeat(request.getWouldRepeat())
                .comments(request.getComments())
                .build();
        
        feedback = feedbackRepository.save(feedback);
        
        // 운동 선호도 학습 업데이트
        updateExercisePreferences(session, request);
        
        log.info("피드백 저장 완료: sessionId={}, feedbackId={}", sessionId, feedback.getId());

        // 후처리: 알림 생성 및 캘린더 이벤트 자동 생성(에러 무시하고 로깅)
        try {
            sendCompletionNotification(session, feedback);
        } catch (Exception e) {
            log.warn("알림 생성 실패: {}", e.getMessage());
        }

        try {
            createCalendarEventForSession(session);
        } catch (Exception e) {
            log.warn("캘린더 이벤트 생성 실패: {}", e.getMessage());
        }
        
        return feedback;
    }
    
    /**
     * 개별 운동 실행 기록 저장
     */
    private void saveExerciseExecution(WorkoutSession session, SessionFeedbackRequest.ExerciseFeedbackRequest request) {
        ExerciseExecution execution = ExerciseExecution.builder()
                .session(session)
                .exerciseName(request.getExerciseName())
                .plannedSets(request.getPlannedSets())
                .completedSets(request.getCompletedSets())
                .plannedReps(request.getPlannedReps())
                .completedReps(request.getCompletedReps())
                .plannedDuration(request.getPlannedDuration())
                .actualDuration(request.getActualDuration())
                .perceivedExertion(request.getPerceivedExertion())
                .build();
        
        executionRepository.save(execution);
    }
    
    /**
     * 운동 선호도 업데이트
     * 피드백 정보를 바탕으로 각 운동에 대한 사용자 선호도를 학습
     */
    private void updateExercisePreferences(WorkoutSession session, SessionFeedbackRequest request) {
        if (request.getExerciseFeedbacks() == null) return;
        
        User user = session.getUser();
        
        for (SessionFeedbackRequest.ExerciseFeedbackRequest exerciseFeedback : request.getExerciseFeedbacks()) {
            // 선호도 점수 계산
            Double preferenceScore = calculateExercisePreferenceScore(request, exerciseFeedback);
            
            // 효과도 점수 계산
            Double effectivenessScore = calculateExerciseEffectivenessScore(exerciseFeedback);
            
            // 선호도 업데이트
            preferenceService.updatePreference(user, exerciseFeedback.getExerciseName(), 
                                             preferenceScore, effectivenessScore);
        }
    }
    
    /**
     * 운동별 선호도 점수 계산
     * 전체 세션 만족도, 재선택 의향, 개별 운동 완료율을 종합
     */
    private Double calculateExercisePreferenceScore(SessionFeedbackRequest sessionFeedback, 
                                                   SessionFeedbackRequest.ExerciseFeedbackRequest exerciseFeedback) {
        double score = 0.0;
        
        // 전체 만족도 기반 점수 (40%)
        if (sessionFeedback.getSatisfaction() != null) {
            score += ((sessionFeedback.getSatisfaction() - 3.0) / 2.0) * 0.4;
        }
        
        // 재선택 의향 기반 점수 (30%)
        if (sessionFeedback.getWouldRepeat() != null) {
            score += (sessionFeedback.getWouldRepeat() ? 0.5 : -0.5) * 0.3;
        }
        
        // 개별 운동 완료율 기반 점수 (30%)
        if (exerciseFeedback.getCompletedSets() != null && exerciseFeedback.getPlannedSets() != null &&
            exerciseFeedback.getCompletedReps() != null && exerciseFeedback.getPlannedReps() != null &&
            exerciseFeedback.getPlannedSets() > 0 && exerciseFeedback.getPlannedReps() > 0) {
            
            double completionRate = (double) (exerciseFeedback.getCompletedSets() * exerciseFeedback.getCompletedReps()) /
                                  (exerciseFeedback.getPlannedSets() * exerciseFeedback.getPlannedReps());
            
            score += ((completionRate - 0.5) * 2.0 - 1.0) * 0.3; // 0.5 완료율을 중립으로 설정
        }
        
        return Math.max(-1.0, Math.min(1.0, score));
    }
    
    /**
     * 운동별 효과도 점수 계산
     * RPE, 완료율을 기반으로 계산
     */
    private Double calculateExerciseEffectivenessScore(SessionFeedbackRequest.ExerciseFeedbackRequest exerciseFeedback) {
        double score = 0.5; // 기본값
        
        // 적절한 RPE 범위(6-8)에서 높은 점수
        if (exerciseFeedback.getPerceivedExertion() != null) {
            int rpe = exerciseFeedback.getPerceivedExertion();
            if (rpe >= 6 && rpe <= 8) {
                score += 0.3;
            } else if (rpe >= 4 && rpe <= 9) {
                score += 0.1;
            }
        }
        
        // 높은 완료율에서 높은 점수
        if (exerciseFeedback.getCompletedSets() != null && exerciseFeedback.getPlannedSets() != null &&
            exerciseFeedback.getCompletedReps() != null && exerciseFeedback.getPlannedReps() != null &&
            exerciseFeedback.getPlannedSets() > 0 && exerciseFeedback.getPlannedReps() > 0) {
            
            double completionRate = (double) (exerciseFeedback.getCompletedSets() * exerciseFeedback.getCompletedReps()) /
                                  (exerciseFeedback.getPlannedSets() * exerciseFeedback.getPlannedReps());
            
            if (completionRate >= 0.9) score += 0.2;
            else if (completionRate >= 0.7) score += 0.1;
            else if (completionRate < 0.5) score -= 0.2;
        }
        
        return Math.max(0.0, Math.min(1.0, score));
    }
    
    /**
     * 사용자의 세션 기록 조회
     */
    @Transactional(readOnly = true)
    public List<WorkoutSession> getUserSessions(User user) {
        return sessionRepository.findByUserOrderBySessionDateDesc(user);
    }
    
    /**
     * 특정 세션의 상세 정보 조회
     */
    @Transactional(readOnly = true)
    public WorkoutSession getSessionWithDetails(Long sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("세션을 찾을 수 없습니다: " + sessionId));
    }

    /**
     * 세션 완료 알림 생성 (통신 서버 REST 호출)
     */
    private void sendCompletionNotification(WorkoutSession session, SessionFeedback feedback) {
        if (session.getUser() == null) return;
        String url = communicationServerUrl + "/api/notifications/create";
        var payload = new java.util.HashMap<String, Object>();
        payload.put("senderUserId", 0); // 시스템
        payload.put("targetUserId", session.getUser().getId());
        payload.put("message", "운동 세션이 저장되었습니다. 수고하셨어요!");
        payload.put("type", "WORKOUT_COMPLETED");
        payload.put("category", "ADMIN");
        payload.put("link", "/calendar");
        restTemplate.postForObject(url, payload, java.util.Map.class);
    }

    /**
     * 세션을 캘린더에 자동 기록
     */
    private void createCalendarEventForSession(WorkoutSession session) throws Exception {
        if (session.getUser() == null) return;
        // 기본 30분 블록 또는 실제 소요시간 사용
        int minutes = session.getActualDuration() != null ? session.getActualDuration() :
                (session.getPlannedDuration() != null ? session.getPlannedDuration() : 30);
        var start = java.time.ZonedDateTime.now(java.time.ZoneId.of("Asia/Seoul"));
        var end = start.plusMinutes(minutes);
        var eventData = new java.util.HashMap<String, Object>();
        eventData.put("summary", "��️ FitMate 운동 세션");
        eventData.put("description", "목표: " + session.getGoal());
        eventData.put("location", "");
        eventData.put("startDateTime", start.toInstant().toString());
        eventData.put("endDateTime", end.toInstant().toString());
        eventData.put("attendeeEmails", java.util.List.of());
        eventData.put("recurrence", null);
        calendarService.createEvent(session.getUser().getId(),
                (String) eventData.get("summary"),
                (String) eventData.get("description"),
                (String) eventData.get("location"),
                new com.google.api.client.util.DateTime((String) eventData.get("startDateTime")),
                new com.google.api.client.util.DateTime((String) eventData.get("endDateTime")),
                java.util.List.of(),
                null);
    }
}