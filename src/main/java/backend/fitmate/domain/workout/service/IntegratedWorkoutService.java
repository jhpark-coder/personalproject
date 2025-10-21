package backend.fitmate.domain.workout.service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import backend.fitmate.domain.notification.service.NotificationService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.domain.workout.entity.ExerciseExecution;
import backend.fitmate.domain.workout.entity.SessionFeedback;
import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.user.entity.UserExercisePreference;
import backend.fitmate.domain.workout.entity.WorkoutRecord;
import backend.fitmate.domain.workout.entity.WorkoutSession;
import backend.fitmate.domain.workout.repository.ExerciseExecutionRepository;
import backend.fitmate.domain.workout.repository.SessionFeedbackRepository;
import backend.fitmate.domain.user.repository.UserExercisePreferenceRepository;
import backend.fitmate.domain.workout.repository.WorkoutRecordRepository;
import backend.fitmate.domain.workout.repository.WorkoutSessionRepository;
import backend.fitmate.common.dto.IntegratedSessionRequest;
import lombok.extern.slf4j.Slf4j;

/**
 * 통합 운동 세션 처리 서비스
 * 운동 완료 → 피드백 → 분석 → 저장 → 캘린더 → 적응형 학습의 전체 플로우 관리
 */
@Service
@Slf4j
@Transactional
public class IntegratedWorkoutService {
    
    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;
    
    @Autowired
    private SessionFeedbackRepository sessionFeedbackRepository;
    
    @Autowired
    private ExerciseExecutionRepository exerciseExecutionRepository;
    
    @Autowired
    private WorkoutRecordRepository workoutRecordRepository;
    
    @Autowired
    private UserExercisePreferenceRepository preferenceRepository;
    
    @Autowired(required = false)
    private NotificationService notificationService;
    
    @Autowired
    private AdaptiveWorkoutRecommendationService adaptiveService;
    
    
    /**
     * 통합 운동 세션 처리
     */
    public Map<String, Object> processCompletedSession(User user, IntegratedSessionRequest request) {
        log.info("통합 운동 세션 처리 시작 - userId: {}, programId: {}", 
            user.getId(), request.getProgramId());
        
        Map<String, Object> result = new HashMap<>();
        WorkoutSession session = null;
        List<ExerciseExecution> executions = null;
        
        try {
            // 1. WorkoutSession 생성 및 저장
            session = createWorkoutSession(user, request);
            result.put("sessionId", session.getId());
            log.info("WorkoutSession 생성 완료 - sessionId: {}", session.getId());
            
            // 2. 각 운동별 ExerciseExecution 저장
            executions = saveExerciseExecutions(session, request.getExercises());
            result.put("exerciseCount", executions.size());
            log.info("ExerciseExecution 저장 완료 - count: {}", executions.size());
            
            // 3. SessionFeedback 저장 (피드백 데이터)
            if (request.getFeedback() != null) {
                SessionFeedback feedback = saveFeedback(session, request.getFeedback());
                result.put("feedbackSaved", feedback != null);
                log.info("SessionFeedback 저장 완료");
            } else {
                result.put("feedbackSaved", false);
                log.info("SessionFeedback 데이터 없음");
            }
            
            // 4. WorkoutRecord 저장 (캘린더용)
            WorkoutRecord record = saveWorkoutRecord(user, request);
            result.put("recordId", record.getId());
            log.info("WorkoutRecord 저장 완료 - recordId: {}", record.getId());
            
            // 5. 사용자 운동 선호도 업데이트
            updateUserPreferences(user, request);
            log.info("사용자 선호도 업데이트 완료");
            
            // 6. 적응형 학습 업데이트
            try {
                adaptiveService.learnFromWorkoutSession(session);
                result.put("learningUpdated", true);
                log.info("적응형 학습 업데이트 완료");
            } catch (Exception e) {
                log.warn("적응형 학습 업데이트 실패: {}", e.getMessage());
                result.put("learningUpdated", false);
            }
        
            
            // 7. 운동 분석 결과 생성
            Map<String, Object> analysis = analyzeWorkoutResults(session, request);
            result.put("analysis", analysis);
            
            log.info("통합 운동 세션 처리 완료 - sessionId: {}, exercises: {}", 
                session.getId(), executions != null ? executions.size() : 0);
            
        } catch (Exception e) {
            log.error("통합 운동 세션 처리 중 오류 발생: ", e);
            throw new RuntimeException("운동 세션 처리 실패: " + e.getMessage(), e);
        }
        
        // 알림 발송 (비동기) - 분석 결과 포함
        if (notificationService != null && session != null) {
            notificationService.sendWorkoutCompletionNotification(user, session, result);
        }
        
        return result;
    }
    
    /**
     * WorkoutSession 엔티티 생성
     */
    private WorkoutSession createWorkoutSession(User user, IntegratedSessionRequest request) {
        // goal 필드가 있으면 사용, 없으면 programId 또는 기본값 사용
        String goal = request.getGoal();
        if (goal == null || goal.isEmpty()) {
            goal = request.getProgramId() != null ? request.getProgramId() : "체중 감량";
        }
        
        WorkoutSession session = WorkoutSession.builder()
            .user(user)
            .sessionDate(LocalDateTime.now())  // sessionDate 추가
            .goal(goal)
            .plannedDuration(request.getTotalDuration() / 60) // 분 단위
            .actualDuration(request.getTotalDuration() / 60)
            .caloriesBurned((int) request.getCaloriesBurned())
            .build();
        
        return workoutSessionRepository.save(session);
    }
    
    /**
     * 운동별 실행 데이터 저장
     * 
     * ⚠️ DB 스키마와 타입 매칭 주의:
     * - form_accuracy: DECIMAL(3,2) → 최대값 9.99 (실제로는 0.00~1.00 사용)
     * - 프론트에서 백분율(0-100)로 보낼 수 있어 정규화 필요
     * - BigDecimal 사용하여 정확한 소수점 처리
     */
    private List<ExerciseExecution> saveExerciseExecutions(WorkoutSession session, 
            List<IntegratedSessionRequest.ExerciseResultData> exercises) {
        
        List<ExerciseExecution> executions = new ArrayList<>();
        
        for (IntegratedSessionRequest.ExerciseResultData exercise : exercises) {
            // ⚠️ formAccuracy 정규화 - DB 컬럼이 DECIMAL(3,2)로 최대 9.99
            // 실제 사용 범위는 0.00~1.00 (0%~100%)
            // 프론트엔드에서 85.5 같은 백분율로 보내면 0.855로 변환 필요
            BigDecimal formAccuracyValue = null;
            Double averageFormScore = exercise.getAverageFormScore();
            if (averageFormScore != null) {
                double score = averageFormScore;
                
                // ⚠️ 중요: 값이 1보다 크면 백분율(0-100)로 판단
                // 예: 85.5 → 0.855로 변환
                if (score > 1.0) {
                    score = score / 100.0;
                }
                
                // 범위 제한: 0.0 ~ 1.0 사이로 강제
                // DB 오류 방지를 위한 안전장치
                score = Math.max(0.0, Math.min(1.0, score));
                formAccuracyValue = BigDecimal.valueOf(score);
            }
            
            ExerciseExecution execution = ExerciseExecution.builder()
                .session(session)
                .exerciseType(exercise.getExerciseType())
                .exerciseName(exercise.getExerciseName())
                // .targetSets(exercise.getTargetSets()) // 필드가 없음
                .completedSets(exercise.getCompletedSets())
                .plannedReps(exercise.getTargetReps())
                .completedReps(exercise.getCompletedReps())
                .formAccuracy(formAccuracyValue)
                .actualDuration(exercise.getDuration())
                .build();
            
            executions.add(exerciseExecutionRepository.save(execution));
        }
        
        return executions;
    }
    
    /**
     * 피드백 데이터 저장
     */
    private SessionFeedback saveFeedback(WorkoutSession session, 
            IntegratedSessionRequest.FeedbackData feedbackData) {
        
        if (feedbackData == null) {
            return null;
        }
        
        // muscleSoreness 값 처리 - null이거나 빈 문자열인 경우 기본값 0 사용
        Integer muscleSoreness = 0;
        if (feedbackData.getMuscleSoreness() != null && !feedbackData.getMuscleSoreness().trim().isEmpty()) {
            try {
                muscleSoreness = Integer.valueOf(feedbackData.getMuscleSoreness());
            } catch (NumberFormatException e) {
                log.warn("Invalid muscleSoreness value: {}, using default 0", feedbackData.getMuscleSoreness());
                muscleSoreness = 0;
            }
        }
        
        SessionFeedback feedback = SessionFeedback.builder()
            .session(session)
            .overallDifficulty(feedbackData.getOverallDifficulty())
            .satisfaction(feedbackData.getSatisfaction())
            .muscleSoreness(muscleSoreness)
            .energyAfter(feedbackData.getEnergyAfter())
            .wouldRepeat(feedbackData.getWouldRepeat())
            .comments(feedbackData.getComments())
            .completionRate(BigDecimal.ONE) // 세션 완료로 간주
            .build();
        
        session.setFeedback(feedback);
        return sessionFeedbackRepository.save(feedback);
    }
    
    /**
     * WorkoutRecord 저장 (캘린더용)
     */
    private WorkoutRecord saveWorkoutRecord(User user, IntegratedSessionRequest request) {
        // 피드백에서 난이도 계산 (만약 피드백이 없으면 기본값 MODERATE)
        WorkoutRecord.WorkoutDifficulty difficulty = WorkoutRecord.WorkoutDifficulty.MODERATE;
        if (request.getFeedback() != null && request.getFeedback().getOverallDifficulty() != null) {
            int diff = request.getFeedback().getOverallDifficulty();
            if (diff <= 1) difficulty = WorkoutRecord.WorkoutDifficulty.VERY_EASY;
            else if (diff == 2) difficulty = WorkoutRecord.WorkoutDifficulty.EASY;
            else if (diff == 3) difficulty = WorkoutRecord.WorkoutDifficulty.MODERATE;
            else if (diff == 4) difficulty = WorkoutRecord.WorkoutDifficulty.HARD;
            else difficulty = WorkoutRecord.WorkoutDifficulty.VERY_HARD;
        }
        
        // workoutType 결정: programTitle이 없으면 goal이나 기본값 사용
        String workoutType = request.getProgramTitle();
        if (workoutType == null || workoutType.isEmpty()) {
            workoutType = request.getGoal() != null ? request.getGoal() : "일반 운동";
        }
        
        WorkoutRecord record = WorkoutRecord.builder()
            .user(user)
            .workoutDate(LocalDate.now())
            .workoutType(workoutType)
            .duration(request.getTotalDuration() / 60) // 분 단위
            .calories((int) request.getCaloriesBurned())
            .intensity(request.getFeedback() != null ? request.getFeedback().getSatisfaction() : 3)
            .difficulty(difficulty)  // 필수 필드 추가
            .notes(buildWorkoutNotes(request))
            .build();
        
        return workoutRecordRepository.save(record);
    }
    
    /**
     * 운동 기록 노트 생성
     */
    private String buildWorkoutNotes(IntegratedSessionRequest request) {
        StringBuilder notes = new StringBuilder();
        String programTitle = request.getProgramTitle() != null ? request.getProgramTitle() : 
                             (request.getGoal() != null ? request.getGoal() : "일반 운동");
        notes.append("운동 프로그램: ").append(programTitle).append("\n");
        notes.append("총 운동: ").append(request.getExercises().size()).append("개\n");
        notes.append("평균 정확도: ").append(String.format("%.1f%%", request.getAverageFormScore() * 100)).append("\n");
        
        if (request.getMotionData() != null) {
            notes.append("최고 수행: ").append(request.getMotionData().getBestExercise()).append("\n");
            if (request.getMotionData().getNeedsImprovement() != null) {
                notes.append("개선 필요: ").append(request.getMotionData().getNeedsImprovement());
            }
        }
        
        return notes.toString();
    }
    
    /**
     * 사용자 운동 선호도 업데이트
     */
    private void updateUserPreferences(User user, IntegratedSessionRequest request) {
        for (IntegratedSessionRequest.ExerciseResultData exercise : request.getExercises()) {
            // 완료율 계산
            double completionRate = (double) exercise.getCompletedReps() / 
                                   (exercise.getTargetReps() > 0 ? exercise.getTargetReps() : 1);
            
            // 선호도 점수 계산 (완료율 + 정확도 + 피드백)
            double preferenceScore = calculatePreferenceScore(
                completionRate, 
                exercise.getAverageFormScore(),
                request.getFeedback()
            );
            
            // 기존 선호도 조회 또는 생성
            UserExercisePreference preference = preferenceRepository
                .findByUserAndExerciseName(user, exercise.getExerciseType())
                .orElse(UserExercisePreference.builder()
                    .user(user)
                    .exerciseName(exercise.getExerciseType())
                    .preferenceScore(BigDecimal.ZERO)
                    .confidenceScore(BigDecimal.ZERO)
                    .totalAttempts(0)
                    .build());
            
            // 선호도 업데이트 (이동평균)
            int newAttempts = preference.getTotalAttempts() + 1;
            double oldScore = preference.getPreferenceScore().doubleValue();
            double newScore = (oldScore * preference.getTotalAttempts() + preferenceScore) / newAttempts;
            
            preference.setPreferenceScore(BigDecimal.valueOf(newScore));
            preference.setTotalAttempts(newAttempts);
            preference.setConfidenceScore(BigDecimal.valueOf(Math.min(1.0, newAttempts * 0.1))); // 10회 이상이면 신뢰도 100%
            preference.setLastPerformed(LocalDateTime.now());
            
            preferenceRepository.save(preference);
        }
    }
    
    /**
     * 선호도 점수 계산
     */
    private double calculatePreferenceScore(double completionRate, double accuracy, 
            IntegratedSessionRequest.FeedbackData feedback) {
        double score = 0.0;
        
        // 완료율 (40%)
        score += completionRate * 0.4;
        
        // 정확도 (30%)
        score += accuracy * 0.3;
        
        // 만족도 (20%)
        if (feedback != null && feedback.getSatisfaction() != null) {
            score += (feedback.getSatisfaction() / 5.0) * 0.2;
        } else {
            score += 0.1; // 기본값
        }
        
        // 재수행 의사 (10%)
        if (feedback != null && Boolean.TRUE.equals(feedback.getWouldRepeat())) {
            score += 0.1;
        }
        
        return Math.max(0.0, Math.min(1.0, score)); // 0.0 ~ 1.0 범위
    }
    
    /**
     * 운동 결과 분석
     */
    private Map<String, Object> analyzeWorkoutResults(WorkoutSession session, 
            IntegratedSessionRequest request) {
        
        Map<String, Object> analysis = new HashMap<>();
        
        // 완료율 분석
        int totalTargetSets = request.getExercises().stream()
            .mapToInt(e -> e.getTargetSets()).sum();
        int totalCompletedSets = request.getExercises().stream()
            .mapToInt(e -> e.getCompletedSets()).sum();
        double completionRate = (double) totalCompletedSets / totalTargetSets;
        
        analysis.put("completionRate", String.format("%.1f%%", completionRate * 100));
        
        // 성과 등급 계산
        String grade = calculateGrade(completionRate, request.getAverageFormScore());
        analysis.put("grade", grade);
        
        // 개선 포인트
        List<String> improvements = new ArrayList<>();
        if (completionRate < 0.8) {
            improvements.add("세트 완료율을 높여보세요");
        }
        if (request.getAverageFormScore() < 0.7) {
            improvements.add("운동 자세에 더 집중해보세요");
        }
        analysis.put("improvements", improvements);
        
        // 다음 추천사항
        List<String> nextRecommendations = new ArrayList<>();
        if (request.getFeedback() != null && request.getFeedback().getOverallDifficulty() != null) {
            if (request.getFeedback().getOverallDifficulty() <= 2) {
                nextRecommendations.add("난이도를 높여보세요");
            } else if (request.getFeedback().getOverallDifficulty() >= 4) {
                nextRecommendations.add("충분한 휴식을 취하세요");
            }
        }
        analysis.put("nextRecommendations", nextRecommendations);
        
        return analysis;
    }
    
    /**
     * 성과 등급 계산
     */
    private String calculateGrade(double completionRate, double accuracy) {
        double score = (completionRate * 0.5) + (accuracy * 0.5);
        
        if (score >= 0.95) return "S";
        if (score >= 0.85) return "A";
        if (score >= 0.75) return "B";
        if (score >= 0.65) return "C";
        return "D";
    }
    
    /**
     * 자동 저장 - 기본 세션 데이터만 저장 (피드백 없이)
     * 운동 완료 즉시 호출되어 데이터 손실 방지
     */
    public Map<String, Object> autoSaveSession(User user, IntegratedSessionRequest request) {
        log.info("자동 저장 시작 - userId: {}, programId: {}", 
            user.getId(), request.getProgramId());
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            // 1. WorkoutSession 생성 (피드백 없이)
            WorkoutSession session = createWorkoutSession(user, request);
            result.put("sessionId", session.getId());
            
            // 2. ExerciseExecution 저장
            List<ExerciseExecution> executions = saveExerciseExecutions(session, request.getExercises());
            result.put("exerciseCount", executions.size());
            
            // 3. WorkoutRecord 저장 (캘린더용)
            WorkoutRecord record = saveWorkoutRecord(user, request);
            result.put("workoutRecordId", record.getId());
            
            log.info("자동 저장 완료 - sessionId: {}", session.getId());
            
        } catch (Exception e) {
            log.error("자동 저장 실패: ", e);
            throw e;
        }
        
        return result;
    }
    
    /**
     * 세션 업데이트 - 자동 저장된 세션에 피드백 추가
     * 
     * ⚠️ 타입 변환 주의사항:
     * - JavaScript는 모든 숫자를 Number 타입으로 보냄 (정수/실수 구분 없음)
     * - JSON 역직렬화 시 숫자는 Double로 파싱됨
     * - 직접 Integer 캐스팅 시 ClassCastException 발생
     * - 반드시 Number 인터페이스를 통해 안전하게 변환
     * 
     * 예시:
     * - JavaScript: {satisfaction: 4} 
     * - JSON: {"satisfaction": 4}
     * - Java Map: satisfaction = Double(4.0)
     * - 잘못된 변환: (Integer) map.get("satisfaction") → ClassCastException
     * - 올바른 변환: ((Number) map.get("satisfaction")).intValue() → 4
     */
    public Map<String, Object> updateSessionWithFeedback(User user, String sessionId, Map<String, Object> request) {
        log.info("세션 업데이트 시작 - sessionId: {}", sessionId);
        
        Map<String, Object> result = new HashMap<>();
        
        try {
            // sessionId 유효성 검사
            if (sessionId == null || sessionId.trim().isEmpty()) {
                throw new IllegalArgumentException("세션 ID가 비어있습니다");
            }
            
            // 기존 세션 조회
            WorkoutSession session = workoutSessionRepository.findById(Long.parseLong(sessionId))
                .orElseThrow(() -> new RuntimeException("세션을 찾을 수 없습니다: " + sessionId));
            
            // 권한 확인
            if (!session.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("세션에 대한 권한이 없습니다");
            }
            
            // 피드백 데이터 추출 및 저장
            @SuppressWarnings("unchecked")
            Map<String, Object> feedbackMap = (Map<String, Object>) request.get("feedback");
            if (feedbackMap != null) {
                IntegratedSessionRequest.FeedbackData feedbackData = new IntegratedSessionRequest.FeedbackData();
                
                // ⚠️ satisfaction: 만족도 (1-5 범위의 정수)
                // JavaScript에서 숫자 4는 Java에서 Double(4.0)으로 파싱됨
                // 반드시 Number 인터페이스를 통해 intValue()로 변환
                Object satisfactionObj = feedbackMap.get("satisfaction");
                if (satisfactionObj instanceof Number) {
                    feedbackData.setSatisfaction(((Number) satisfactionObj).intValue());
                }
                
                // ⚠️ overallDifficulty: 운동 난이도 (1-5 범위의 정수)
                // 직접 Integer 캐스팅 금지! Double일 수 있음
                Object overallDifficultyObj = feedbackMap.get("overallDifficulty");
                if (overallDifficultyObj instanceof Number) {
                    feedbackData.setOverallDifficulty(((Number) overallDifficultyObj).intValue());
                }
                
                // muscleSoreness: 근육통 정도 (String 타입: "none", "light", "moderate", "severe")
                feedbackData.setMuscleSoreness((String) feedbackMap.get("muscleSoreness"));
                
                // ⚠️ energyAfter: 운동 후 에너지 레벨 (1-5 범위의 정수)
                // JSON 숫자는 Double로 파싱되므로 Number 인터페이스 필수
                Object energyAfterObj = feedbackMap.get("energyAfter");
                if (energyAfterObj instanceof Number) {
                    feedbackData.setEnergyAfter(((Number) energyAfterObj).intValue());
                }
                
                // wouldRepeat: 재운동 의향 (Boolean 타입)
                feedbackData.setWouldRepeat((Boolean) feedbackMap.get("wouldRepeat"));
                
                // comments: 사용자 코멘트 (String 타입, null 가능)
                feedbackData.setComments((String) feedbackMap.get("comments"));
                
                SessionFeedback feedback = saveFeedback(session, feedbackData);
                result.put("feedbackId", feedback != null ? feedback.getId() : null);
            }
            
            // 사용자 선호도 업데이트는 피드백 데이터가 있을 때만
            // (현재는 Map 형태이므로 생략, 추후 개선 필요)
            
            result.put("sessionId", session.getId());
            result.put("message", "세션이 성공적으로 업데이트되었습니다");
            
            log.info("세션 업데이트 완료 - sessionId: {}", sessionId);
            
        } catch (Exception e) {
            log.error("세션 업데이트 실패: ", e);
            throw e;
        }
        
        return result;
    }
    
    /**
     * 완전한 세션 생성 - 자동 저장 실패 시 또는 새로운 세션
     * 
     * ⚠️ 타입 변환 주의사항:
     * - JavaScript는 모든 숫자를 Number 타입으로 전송 (정수/실수 구분 없음)
     * - JSON 파싱 후 숫자는 보통 Double로 변환됨
     * - Java Integer로 직접 캐스팅 시 ClassCastException 발생 가능
     * - 반드시 Number 인터페이스를 통해 안전하게 변환할 것
     */
    @SuppressWarnings("unchecked")
    public Map<String, Object> createCompleteSession(User user, Map<String, Object> fullData) {
        log.info("완전한 세션 생성 시작 - userId: {}", user.getId());
        
        // Map 데이터를 IntegratedSessionRequest로 변환
        IntegratedSessionRequest request = new IntegratedSessionRequest();
        request.setProgramId((String) fullData.get("programId"));
        request.setProgramTitle((String) fullData.get("programTitle"));
        
        // ⚠️ 타입 변환: JavaScript Number → Java Integer
        // JavaScript에서 온 숫자는 Double일 수 있으므로 Number 인터페이스 사용
        // 절대 (Integer) 직접 캐스팅 하지 말 것!
        Object totalDuration = fullData.get("totalDuration");
        if (totalDuration instanceof Number) {
            request.setTotalDuration(((Number) totalDuration).intValue());
        }
        
        // exercises 변환
        List<Map<String, Object>> exercisesList = (List<Map<String, Object>>) fullData.get("exercises");
        if (exercisesList != null) {
            List<IntegratedSessionRequest.ExerciseResultData> exercises = new ArrayList<>();
            for (Map<String, Object> exerciseMap : exercisesList) {
                IntegratedSessionRequest.ExerciseResultData exercise = new IntegratedSessionRequest.ExerciseResultData();
                exercise.setExerciseType((String) exerciseMap.get("exerciseType"));
                exercise.setExerciseName((String) exerciseMap.get("exerciseName"));
                
                // ⚠️ 타입 변환 패턴: 모든 숫자는 Number 인터페이스로 처리
                // JavaScript의 숫자는 타입 구분이 없어 3 → 3.0으로 올 수 있음
                // 예: JS의 3 → JSON → Java Double(3.0) → intValue()로 안전 변환
                
                // completedSets: 완료한 세트 수 (예: 3세트)
                Object completedSets = exerciseMap.get("completedSets");
                if (completedSets instanceof Number) {
                    exercise.setCompletedSets(((Number) completedSets).intValue());
                }
                
                // targetSets: 목표 세트 수
                Object targetSets = exerciseMap.get("targetSets");
                if (targetSets instanceof Number) {
                    exercise.setTargetSets(((Number) targetSets).intValue());
                }
                
                // completedReps: 완료한 반복 횟수 (예: 15회)
                Object completedReps = exerciseMap.get("completedReps");
                if (completedReps instanceof Number) {
                    exercise.setCompletedReps(((Number) completedReps).intValue());
                }
                
                // targetReps: 목표 반복 횟수
                Object targetReps = exerciseMap.get("targetReps");
                if (targetReps instanceof Number) {
                    exercise.setTargetReps(((Number) targetReps).intValue());
                }
                
                // ⚠️ averageFormScore: 자세 정확도
                // 프론트에서 백분율(0-100) 또는 비율(0-1)로 올 수 있음
                // saveExerciseExecutions에서 추가 정규화 필요
                Object formScore = exerciseMap.get("averageFormScore");
                if (formScore instanceof Number) {
                    exercise.setAverageFormScore(((Number) formScore).doubleValue());
                }
                
                // duration: 운동 시간 (초 단위)
                Object duration = exerciseMap.get("duration");
                if (duration instanceof Number) {
                    exercise.setDuration(((Number) duration).intValue());
                }
                
                exercises.add(exercise);
            }
            request.setExercises(exercises);
        }
        
        // ⚠️ feedback 변환 - 피드백은 선택사항 (사용자가 스킵 가능)
        // null 체크 필수! 피드백 없이도 세션 저장 가능해야 함
        Map<String, Object> feedbackMap = (Map<String, Object>) fullData.get("feedback");
        if (feedbackMap != null) {
            IntegratedSessionRequest.FeedbackData feedback = new IntegratedSessionRequest.FeedbackData();
            
            // satisfaction: 만족도 (1-5 스케일)
            Object satisfaction = feedbackMap.get("satisfaction");
            if (satisfaction instanceof Number) {
                feedback.setSatisfaction(((Number) satisfaction).intValue());
            }
            
            // overallDifficulty: 전체 난이도 (1-5 스케일)
            Object overallDifficulty = feedbackMap.get("overallDifficulty");
            if (overallDifficulty instanceof Number) {
                feedback.setOverallDifficulty(((Number) overallDifficulty).intValue());
            }
            
            // muscleSoreness: 근육통 정도 (텍스트)
            feedback.setMuscleSoreness((String) feedbackMap.get("muscleSoreness"));
            
            // energyAfter: 운동 후 에너지 레벨 (1-5 스케일)
            Object energyAfter = feedbackMap.get("energyAfter");
            if (energyAfter instanceof Number) {
                feedback.setEnergyAfter(((Number) energyAfter).intValue());
            }
            
            // wouldRepeat: 다시 하고 싶은지 (boolean)
            feedback.setWouldRepeat((Boolean) feedbackMap.get("wouldRepeat"));
            
            // comments: 추가 코멘트 (텍스트)
            feedback.setComments((String) feedbackMap.get("comments"));
            request.setFeedback(feedback);
        }
        
        // processCompletedSession 호출하여 전체 플로우 실행
        return processCompletedSession(user, request);
    }
}