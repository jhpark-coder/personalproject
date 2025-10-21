package backend.fitmate.domain.workout.service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import backend.fitmate.domain.workout.entity.ExerciseExecution;
import backend.fitmate.domain.workout.entity.SessionFeedback;
import backend.fitmate.domain.user.entity.User;
import backend.fitmate.domain.user.entity.UserExercisePreference;
import backend.fitmate.domain.workout.entity.WorkoutSession;
import backend.fitmate.domain.workout.repository.ExerciseExecutionRepository;
import backend.fitmate.domain.user.repository.UserExercisePreferenceRepository;
import backend.fitmate.domain.workout.repository.WorkoutSessionRepository;
import backend.fitmate.common.dto.UserFitnessProfile;
import lombok.extern.slf4j.Slf4j;
import backend.fitmate.domain.user.service.UserFitnessProfileService;
import backend.fitmate.domain.user.service.UserExercisePreferenceService;

/**
 * 적응형 운동 추천 서비스
 * 사용자 피드백과 선호도를 학습하여 개인화된 운동을 추천
 */
@Service
@Slf4j
@Transactional(readOnly = true)
public class AdaptiveWorkoutRecommendationService {
    
    private final UserFitnessProfileService profileService;
    
    private final UserExercisePreferenceService preferenceService;
    
    private final ExerciseExecutionRepository executionRepository;
    
    private final UserExercisePreferenceRepository preferenceRepository;
    
    private final WorkoutSessionRepository workoutSessionRepository;
    
    @Autowired
    public AdaptiveWorkoutRecommendationService(
        UserFitnessProfileService profileService,
        UserExercisePreferenceService preferenceService,
        ExerciseExecutionRepository executionRepository,
        UserExercisePreferenceRepository preferenceRepository,
        WorkoutSessionRepository workoutSessionRepository
    ) {
        this.profileService = profileService;
        this.preferenceService = preferenceService;
        this.executionRepository = executionRepository;
        this.preferenceRepository = preferenceRepository;
        this.workoutSessionRepository = workoutSessionRepository;
    }
    
    /**
     * 적응형 운동 추천 생성 (모션 분석 결과 반영)
     */
    public Map<String, Object> generateAdaptiveRecommendation(User user, Map<String, Object> requestData) {
        log.info("적응형 운동 추천 생성 시작: userId={}", user.getId());

        // 사용자 피트니스 프로필 계산
        UserFitnessProfile profile = profileService.calculateProfile(user);

        // 요청 데이터에서 목표와 시간 추출
        String goal = (String) requestData.getOrDefault("goal", user.getGoal() != null ? user.getGoal() : "diet");
        Integer targetDuration = Integer.parseInt(requestData.getOrDefault("targetDuration", "45").toString());

        // 모션 분석 결과 추출 (있는 경우)
        @SuppressWarnings("unchecked")
        Map<String, Object> motionAnalysis = (Map<String, Object>) requestData.get("motionAnalysis");

        // 적응형 운동 선택 (모션 분석 결과 반영)
        List<Map<String, Object>> selectedExercises = selectAdaptiveExercises(user, profile, goal, targetDuration, motionAnalysis);

        // 운동 계획 구성
        Map<String, Object> workoutPlan = createAdaptiveWorkoutPlan(selectedExercises, profile);

        // 추천 결과 구성
        Map<String, Object> recommendation = new HashMap<>();
        recommendation.put("userProfile", createEnhancedUserProfile(user, profile));
        recommendation.put("workoutPlan", workoutPlan);
        recommendation.put("estimatedCalories", calculateAdaptiveCalories(selectedExercises, user));
        recommendation.put("totalDuration", targetDuration);
        recommendation.put("recommendations", generatePersonalizedTips(user, profile));
        recommendation.put("adaptationInfo", createAdaptationInfo(profile));

        // 모션 기반 인사이트 추가
        if (motionAnalysis != null) {
            recommendation.put("motionInsights", generateMotionBasedInsights(motionAnalysis));
        }

        log.info("적응형 운동 추천 완료: userId={}, 신뢰도={}, 추천운동수={}, 모션분석포함={}",
                user.getId(), profile.getConfidenceScore(), selectedExercises.size(), motionAnalysis != null);

        return recommendation;
    }

    /**
     * 운동 세션 결과로부터 학습하여 사용자 프로필 업데이트
     */
    @Transactional
    public void learnFromWorkoutSession(WorkoutSession session) {
        User user = session.getUser();
        if (user == null) return;

        double performanceScore = 0.0;
        int exerciseCount = 0;

        for (ExerciseExecution execution : session.getExerciseExecutions()) {
            exerciseCount++;
            // For simplicity, we assume a target of 10 reps. 
            // A real implementation would fetch the target from the workout plan.
            int targetReps = 10; 
            if (execution.getCompletedReps() >= targetReps) {
                performanceScore += 1.0; // Succeeded
            } else if (execution.getCompletedReps() > 0) {
                performanceScore += 0.5; // Partially succeeded
            }
        }

        if (exerciseCount > 0) {
            double averagePerformance = performanceScore / exerciseCount;
            double currentFitnessLevel = user.getFitnessLevel() != null ? user.getFitnessLevel() : 0.5;
            
            // Adjust fitness level based on performance
            double adjustment = (averagePerformance - 0.5) * 0.05; // Max change per session is 0.025
            double newFitnessLevel = currentFitnessLevel + adjustment;
            
            // Clamp the value between 0.1 and 1.0
            newFitnessLevel = Math.max(0.1, Math.min(1.0, newFitnessLevel));

            user.setFitnessLevel(newFitnessLevel);
            // The user is attached to the session, so saving it should cascade.
            // Explicitly saving the user is safer depending on cascade settings.
            // userRepository.save(user); // Assuming a userRepository is injected.
            log.info("Updated fitness level for user {}: {}", user.getId(), newFitnessLevel);
        }
    }
    
    /**
     * 적응형 운동 선택 알고리즘 (모션 분석 결과 반영)
     */
    private List<Map<String, Object>> selectAdaptiveExercises(User user, UserFitnessProfile profile, String goal, int targetDuration, Map<String, Object> motionAnalysis) {
        // 1. 목표별 운동 후보군 구성
        List<String> candidateExercises = buildExercisePool(goal);
        
        // 2. 운동별 점수 계산
        List<ScoredExercise> scoredExercises = candidateExercises.stream()
                .map(exercise -> calculateExerciseScore(user, profile, exercise, goal))
                .sorted(Comparator.comparingDouble(ScoredExercise::score).reversed())
                .collect(Collectors.toList());
        
        // 3. 제약 조건 적용 및 운동 선택
        List<Map<String, Object>> selectedExercises = new ArrayList<>();
        
        // 최근에 한 운동 제외
        List<String> recentExercises = getRecentExercises(user, 7); // 최근 7일
        
        // 비선호 운동 제외 (신뢰도 높은 경우만)
        List<String> avoidExercises = preferenceService.getReliablePreferences(user).stream()
                .filter(pref -> pref.getPreferenceScore().doubleValue() <= -0.3)
                .map(UserExercisePreference::getExerciseName)
                .collect(Collectors.toList());
        
        // 운동 선택 (균형과 다양성 고려) - 경험별 동적 조정 (한 세션에 적절한 개수로 조정)
        int maxExercises = switch (profile.getExperienceLevel() != null ? profile.getExperienceLevel() : "intermediate") {
            case "beginner" -> 4;      // 초급자: 4개 운동
            case "intermediate" -> 5;  // 중급자: 5개 운동  
            case "advanced" -> 6;      // 상급자: 6개 운동
            default -> 4;
        };
        
        Map<String, Integer> targetCounts = Map.of(
                "상체", 2, "하체", 2, "코어", 1, "전신", 1
        );
        Map<String, Integer> currentCounts = new HashMap<>();
        
        for (ScoredExercise scored : scoredExercises) {
            if (selectedExercises.size() >= maxExercises) break;
            
            String exerciseName = scored.exerciseName();
            
            // 제외 조건 체크
            if (recentExercises.contains(exerciseName) && selectedExercises.size() > 3) continue;
            if (avoidExercises.contains(exerciseName)) continue;
            
            // 적응형 운동 생성
            Map<String, Object> exercise = createAdaptiveExercise(user, profile, exerciseName, scored.score());
            String target = (String) exercise.get("target");
            
            // 균형 체크
            int currentCount = currentCounts.getOrDefault(target, 0);
            int targetCount = targetCounts.getOrDefault(target, 1);
            
            if (currentCount < targetCount || selectedExercises.size() < Math.min(5, maxExercises)) {
                selectedExercises.add(exercise);
                currentCounts.put(target, currentCount + 1);
            }
        }
        
        // 최소 운동 개수 보장 (경험별)
        int minExercises = switch (profile.getExperienceLevel() != null ? profile.getExperienceLevel() : "intermediate") {
            case "beginner" -> 3;
            case "intermediate" -> 5;
            case "advanced" -> 7;
            default -> 5;
        };
        
        while (selectedExercises.size() < minExercises && !candidateExercises.isEmpty()) {
            for (String exercise : candidateExercises) {
                if (selectedExercises.stream().noneMatch(e -> e.get("name").equals(exercise))) {
                    selectedExercises.add(createAdaptiveExercise(user, profile, exercise, 0.5));
                    break;
                }
            }
        }
        
        return selectedExercises;
    }
    
    /**
     * 운동별 점수 계산 (MotionCoach 데이터 통합)
     */
    private ScoredExercise calculateExerciseScore(User user, UserFitnessProfile profile, String exerciseName, String goal) {
        double score = 0.0;
        
        // 1. 목표 적합도 (25%)
        score += calculateGoalFitScore(exerciseName, goal) * 0.25;
        
        // 2. MotionCoach 성과 데이터 (20%) - 새로 추가
        MotionCoachMetrics motionMetrics = getMotionCoachMetrics(user, exerciseName);
        score += calculateMotionCoachScore(motionMetrics) * 0.2;
        
        // 3. 개인 선호도 (20%)
        Double preferenceScore = preferenceService.getPreferenceScore(user, exerciseName);
        Double confidenceScore = preferenceService.getConfidenceScore(user, exerciseName);
        if (confidenceScore > 0.3) { // 신뢰할 수 있는 데이터가 있는 경우만
            score += preferenceScore * 0.2;
        } else {
            score += 0.0; // 중립
        }
        
        // 4. 피트니스 레벨 적합도 (15%)
        score += calculateFitnessLevelFit(exerciseName, profile.getCurrentFitnessLevel()) * 0.15;
        
        // 5. 세션 피드백 점수 (10%) - 새로 추가
        score += calculateSessionFeedbackScore(user, exerciseName) * 0.1;
        
        // 6. 다양성 보너스 (10%)
        score += calculateVarietyBonus(user, exerciseName) * 0.1;
        
        return new ScoredExercise(exerciseName, Math.max(0.0, Math.min(1.0, score)));
    }
    
    /**
     * 적응형 운동 생성 (난이도, 볼륨 조절)
     */
    private Map<String, Object> createAdaptiveExercise(User user, UserFitnessProfile profile, String exerciseName, double score) {
        // 기본 운동 템플릿 가져오기
        Map<String, Object> baseExercise = getBaseExercise(exerciseName);
        
        // 적응 팩터 계산
        double adaptationFactor = profile.getAdaptationFactor();
        
        // 개별 운동 이력 확인
        ExerciseProgress progress = getExerciseProgress(user, exerciseName);
        
        // 세트 수 조절
        int baseSets = (Integer) baseExercise.get("sets");
        int adaptedSets = adaptSets(baseSets, adaptationFactor, progress);
        
        // 반복 수 조절
        int baseReps = (Integer) baseExercise.get("reps");
        int adaptedReps = adaptReps(baseReps, adaptationFactor, progress);
        
        // 휴식 시간 조절
        int baseRest = (Integer) baseExercise.get("restSeconds");
        int adaptedRest = adaptRest(baseRest, profile.getRecoveryPattern());
        
        // 강도 조절
        double baseMets = (Double) baseExercise.get("mets");
        double adaptedMets = adaptMets(baseMets, adaptationFactor);
        
        Map<String, Object> adaptiveExercise = new HashMap<>(baseExercise);
        adaptiveExercise.put("sets", adaptedSets);
        adaptiveExercise.put("reps", adaptedReps);
        adaptiveExercise.put("restSeconds", adaptedRest);
        adaptiveExercise.put("mets", adaptedMets);
        adaptiveExercise.put("adaptationScore", score);
        adaptiveExercise.put("personalizedTip", generateExerciseTip(user, exerciseName, adaptationFactor));
        
        return adaptiveExercise;
    }
    
    /**
     * 세트 수 적응
     */
    private int adaptSets(int baseSets, double adaptationFactor, ExerciseProgress progress) {
        if (progress.averageCompletionRate() > 0.9 && progress.averageDifficulty() < 2.5) {
            return Math.min(baseSets + 1, 6); // 최대 6세트
        }
        if (progress.averageCompletionRate() < 0.7 || progress.averageDifficulty() > 4.0) {
            return Math.max(baseSets - 1, 2); // 최소 2세트
        }
        
        // 일반적인 적응
        int adaptation = (int) Math.round(adaptationFactor * 2);
        return Math.max(2, Math.min(6, baseSets + adaptation));
    }
    
    /**
     * 반복 수 적응
     */
    private int adaptReps(int baseReps, double adaptationFactor, ExerciseProgress progress) {
        // 진행도 기반 조절
        if (progress.averageCompletionRate() > 0.95 && progress.averageDifficulty() < 2.5) {
            return (int) (baseReps * 1.2); // 20% 증가
        }
        if (progress.averageCompletionRate() < 0.6 || progress.averageDifficulty() > 4.0) {
            return (int) (baseReps * 0.8); // 20% 감소
        }
        
        // 일반적인 적응
        return Math.max(5, (int) (baseReps * (1.0 + adaptationFactor * 0.3)));
    }
    
    /**
     * 휴식 시간 적응
     */
    private int adaptRest(int baseRest, double recoveryPattern) {
        // 회복 패턴이 낮으면 더 긴 휴식
        double factor = (recoveryPattern - 3.0) / 2.0; // -1.0 ~ 1.0
        return Math.max(30, (int) (baseRest * (1.0 - factor * 0.2)));
    }
    
    /**
     * MET 값 적응
     */
    private double adaptMets(double baseMets, double adaptationFactor) {
        return Math.max(2.0, baseMets * (1.0 + adaptationFactor * 0.15));
    }
    
    /**
     * MotionCoach 성과 메트릭 조회
     */
    private MotionCoachMetrics getMotionCoachMetrics(User user, String exerciseName) {
        LocalDateTime fromDate = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(30); // 최근 30일
        List<WorkoutSession> sessions = workoutSessionRepository.findRecentSessions(user, fromDate);
        
        List<ExerciseExecution> motionCoachExecutions = sessions.stream()
                .flatMap(session -> session.getExerciseExecutions().stream())
                .filter(execution -> execution.getExerciseName().equals(exerciseName))
                .filter(execution -> {
                    // MotionCoach를 통한 운동인지 확인 (세션 피드백 코멘트로 판별)
                    SessionFeedback feedback = execution.getSession().getFeedback();
                    return feedback != null && feedback.getComments() != null && 
                           feedback.getComments().contains("모션 코치");
                })
                .collect(Collectors.toList());
        
        if (motionCoachExecutions.isEmpty()) {
            return new MotionCoachMetrics(0.0, 0.0, 0.0, 0); // 기본값
        }
        
        // 평균 완료율
        double avgCompletionRate = motionCoachExecutions.stream()
                .mapToDouble(execution -> execution.getCompletionRate() != null ? execution.getCompletionRate() : 0.8)
                .average()
                .orElse(0.8);
        
        // 평균 자세 정확도 (세션 피드백의 완료율을 자세 정확도로 사용)
        double avgFormAccuracy = motionCoachExecutions.stream()
                .map(execution -> execution.getSession().getFeedback())
                .filter(feedback -> feedback != null && feedback.getCompletionRate() != null)
                .mapToDouble(feedback -> feedback.getCompletionRate().doubleValue())
                .average()
                .orElse(0.8);
        
        // 개선 추세 (최근 5회 세션과 이전 5회 세션 비교)
        List<ExerciseExecution> sortedExecutions = motionCoachExecutions.stream()
                .sorted((a, b) -> a.getSession().getSessionDate().compareTo(b.getSession().getSessionDate()))
                .collect(Collectors.toList());
        
        double improvementTrend = 0.0;
        if (sortedExecutions.size() >= 4) {
            int midPoint = sortedExecutions.size() / 2;
            double oldAvg = sortedExecutions.subList(0, midPoint).stream()
                    .mapToDouble(execution -> execution.getCompletionRate() != null ? execution.getCompletionRate() : 0.8)
                    .average()
                    .orElse(0.8);
            double newAvg = sortedExecutions.subList(midPoint, sortedExecutions.size()).stream()
                    .mapToDouble(execution -> execution.getCompletionRate() != null ? execution.getCompletionRate() : 0.8)
                    .average()
                    .orElse(0.8);
            improvementTrend = newAvg - oldAvg; // -1.0 ~ 1.0 범위
        }
        
        return new MotionCoachMetrics(avgCompletionRate, avgFormAccuracy, improvementTrend, motionCoachExecutions.size());
    }
    
    /**
     * MotionCoach 점수 계산 (실시간 모션 분석 반영)
     */
    private double calculateMotionCoachScore(MotionCoachMetrics metrics) {
        if (metrics.dataPoints() == 0) {
            return 0.5; // 데이터가 없으면 중립
        }

        double score = 0.0;

        // 완료율 점수 (40%)
        score += metrics.avgCompletionRate() * 0.4;

        // 자세 정확도 점수 (40%)
        score += metrics.avgFormAccuracy() * 0.4;

        // 개선 추세 점수 (20%)
        // 개선되고 있으면 높은 점수, 악화되면 낮은 점수
        double trendScore = 0.5 + (metrics.improvementTrend() * 0.5); // 0.0 ~ 1.0으로 정규화
        score += Math.max(0.0, Math.min(1.0, trendScore)) * 0.2;

        return Math.max(0.0, Math.min(1.0, score));
    }

    /**
     * 실시간 모션 분석 기반 점수 보정
     */
    private double calculateRealTimeMotionAdjustment(String exerciseName, Map<String, Object> motionAnalysis) {
        if (motionAnalysis == null) {
            return 0.0; // 모션 분석 데이터가 없으면 보정 없음
        }

        double adjustment = 0.0;

        try {
            // 현재 운동과 관련된 모션 데이터 추출
            @SuppressWarnings("unchecked")
            Map<String, Object> currentExerciseAnalysis = (Map<String, Object>) motionAnalysis.get(exerciseName);
            if (currentExerciseAnalysis == null) {
                return 0.0;
            }

            // 평균 신뢰도
            Double avgConfidence = (Double) currentExerciseAnalysis.getOrDefault("avgConfidence", 0.0);
            if (avgConfidence > 0.8) {
                adjustment += 0.1; // 높은 신뢰도는 긍정적
            } else if (avgConfidence < 0.5) {
                adjustment -= 0.1; // 낮은 신뢰도는 부정적
            }

            // 폼 평가 점수
            Double formScore = (Double) currentExerciseAnalysis.getOrDefault("formScore", 0.0);
            if (formScore > 80) {
                adjustment += 0.15; // 좋은 폼은 추천 증가
            } else if (formScore < 60) {
                adjustment -= 0.2; // 나쁜 폼은 추천 감소
            }

            // 개선 필요 영역
            @SuppressWarnings("unchecked")
            List<String> issues = (List<String>) currentExerciseAnalysis.getOrDefault("issues", new ArrayList<>());
            if (issues.contains("깊이가 부족")) {
                adjustment -= 0.05; // 깊이 부족은 약간 감소
            }
            if (issues.contains("자세 불안정")) {
                adjustment -= 0.1; // 자세 불안정은 크게 감소
            }

            // 개선 강점
            @SuppressWarnings("unchecked")
            List<String> strengths = (List<String>) currentExerciseAnalysis.getOrDefault("strengths", new ArrayList<>());
            if (strengths.contains("균형 좋음")) {
                adjustment += 0.1; // 균형 좋음은 긍정적
            }

            log.debug("실시간 모션 분석 보정: {} - 조정값={}", exerciseName, adjustment);

        } catch (Exception e) {
            log.warn("실시간 모션 분석 보정 계산 중 오류: {}", e.getMessage());
        }

        return Math.max(-0.3, Math.min(0.3, adjustment)); // -0.3 ~ 0.3 범위 제한
    }

    /**
     * 모션 기반 인사이트 생성
     */
    private Map<String, Object> generateMotionBasedInsights(Map<String, Object> motionAnalysis) {
        Map<String, Object> insights = new HashMap<>();

        if (motionAnalysis == null) {
            insights.put("available", false);
            insights.put("message", "모션 분석 데이터가 없습니다");
            return insights;
        }

        List<String> recommendations = new ArrayList<>();
        List<String> strengths = new ArrayList<>();
        List<String> concerns = new ArrayList<>();

        try {
            // 운동별 분석
            for (Map.Entry<String, Object> entry : motionAnalysis.entrySet()) {
                String exerciseName = entry.getKey();
                @SuppressWarnings("unchecked")
                Map<String, Object> analysis = (Map<String, Object>) entry.getValue();

                Double formScore = (Double) analysis.getOrDefault("formScore", 0.0);
                @SuppressWarnings("unchecked")
                List<String> issues = (List<String>) analysis.getOrDefault("issues", new ArrayList<>());
                @SuppressWarnings("unchecked")
                List<String> exerciseStrengths = (List<String>) analysis.getOrDefault("strengths", new ArrayList<>());

                if (formScore > 85) {
                    strengths.add(exerciseName + " 자세가 매우 좋습니다");
                } else if (formScore < 70) {
                    concerns.add(exerciseName + " 자세에 개선이 필요합니다");
                }

                // 문제점 기반 추천
                if (issues.contains("깊이가 부족")) {
                    recommendations.add(exerciseName + "는 더 깊게 수행해보세요");
                }
                if (issues.contains("자세 불안정")) {
                    recommendations.add(exerciseName + "는 코어를 더 단단히 조이세요");
                }

                strengths.addAll(exerciseStrengths.stream()
                    .map(strength -> exerciseName + ": " + strength)
                    .collect(Collectors.toList()));
            }

            insights.put("available", true);
            insights.put("recommendations", recommendations);
            insights.put("strengths", strengths);
            insights.put("concerns", concerns);
            insights.put("overallAssessment", generateOverallAssessment(motionAnalysis));

        } catch (Exception e) {
            log.warn("모션 기반 인사이트 생성 중 오류: {}", e.getMessage());
            insights.put("available", false);
            insights.put("error", e.getMessage());
        }

        return insights;
    }

    /**
     * 전체 평가 생성
     */
    private String generateOverallAssessment(Map<String, Object> motionAnalysis) {
        double avgFormScore = 0.0;
        int count = 0;

        for (Object analysis : motionAnalysis.values()) {
            if (analysis instanceof Map) {
                @SuppressWarnings("unchecked")
                Map<String, Object> analysisMap = (Map<String, Object>) analysis;
                Double formScore = (Double) analysisMap.getOrDefault("formScore", 0.0);
                avgFormScore += formScore;
                count++;
            }
        }

        if (count == 0) {
            return "분석할 데이터가 부족합니다";
        }

        avgFormScore /= count;

        if (avgFormScore > 85) {
            return "탁월한 운동 자세입니다! 현재 페이스를 유지하세요";
        } else if (avgFormScore > 75) {
            return "좋은 운동 자세입니다. 작은 개선점들을 확인해보세요";
        } else if (avgFormScore > 65) {
            return "기초적인 자세가 잘 잡혀있습니다. 꾸준한 연습으로 개선해보세요";
        } else {
            return "자세 개선이 필요합니다. 전문가의 도움을 받아보세요";
        }
    }
    
    /**
     * 세션 피드백 점수 계산
     */
    private double calculateSessionFeedbackScore(User user, String exerciseName) {
        LocalDateTime fromDate = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(21); // 최근 3주
        List<WorkoutSession> sessions = workoutSessionRepository.findRecentSessions(user, fromDate);
        
        List<SessionFeedback> relevantFeedbacks = sessions.stream()
                .filter(session -> session.getExerciseExecutions().stream()
                        .anyMatch(execution -> execution.getExerciseName().equals(exerciseName)))
                .map(WorkoutSession::getFeedback)
                .filter(feedback -> feedback != null)
                .collect(Collectors.toList());
        
        if (relevantFeedbacks.isEmpty()) {
            return 0.5; // 데이터가 없으면 중립
        }
        
        double score = 0.0;
        
        // 만족도 점수 (40%) - 최신 피드백에 더 높은 가중치
        List<SessionFeedback> sortedFeedbacks = relevantFeedbacks.stream()
                .sorted((f1, f2) -> f2.getSession().getSessionDate().compareTo(f1.getSession().getSessionDate()))
                .collect(Collectors.toList());
        
        double weightedSatisfaction = 0.0;
        double totalWeight = 0.0;
        for (int i = 0; i < sortedFeedbacks.size(); i++) {
            SessionFeedback feedback = sortedFeedbacks.get(i);
            if (feedback.getSatisfaction() != null) {
                double weight = 1.0 / (1.0 + i * 0.1); // 최신일수록 높은 가중치
                weightedSatisfaction += feedback.getSatisfaction() * weight;
                totalWeight += weight;
            }
        }
        double avgSatisfaction = totalWeight > 0 ? weightedSatisfaction / totalWeight : 3.0;
        score += ((avgSatisfaction - 1.0) / 4.0) * 0.4;
        
        // 난이도 적정성 점수 (30%)
        double avgDifficulty = relevantFeedbacks.stream()
                .filter(feedback -> feedback.getOverallDifficulty() != null)
                .mapToInt(SessionFeedback::getOverallDifficulty)
                .average()
                .orElse(3.0); // 기본값 3 (적당함)
        // 3이 최적이므로 3에서 멀수록 낮은 점수
        double difficultyScore = 1.0 - Math.abs(avgDifficulty - 3.0) / 2.0;
        score += Math.max(0.0, difficultyScore) * 0.3;
        
        // 재선택 의향 점수 (30%)
        long wouldRepeatCount = relevantFeedbacks.stream()
                .filter(feedback -> feedback.getWouldRepeat() != null)
                .mapToInt(feedback -> feedback.getWouldRepeat() ? 1 : 0)
                .sum();
        double wouldRepeatRatio = wouldRepeatCount / (double) relevantFeedbacks.size();
        score += wouldRepeatRatio * 0.3;
        
        return Math.max(0.0, Math.min(1.0, score));
    }

    /**
     * 운동별 진행도 계산 - 최신 성과를 더 반영
     */
    private ExerciseProgress getExerciseProgress(User user, String exerciseName) {
        LocalDateTime fromDate = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(21); // 최근 3주
        List<ExerciseExecution> executions = executionRepository.findRecentExerciseExecutions(user, exerciseName, fromDate);
        
        if (executions.isEmpty()) {
            return new ExerciseProgress(0.8, 3.0, 0); // 기본값
        }
        
        // 최신 실행을 더 높은 가중치로 반영
        executions.sort((e1, e2) -> e2.getSession().getSessionDate().compareTo(e1.getSession().getSessionDate()));
        
        double weightedCompletionRate = 0.0;
        double weightedDifficulty = 0.0;
        double totalWeight = 0.0;
        
        for (int i = 0; i < executions.size(); i++) {
            ExerciseExecution execution = executions.get(i);
            double weight = 1.0 / (1.0 + i * 0.15); // 최신일수록 높은 가중치
            
            weightedCompletionRate += execution.getCompletionRate() * weight;
            
            if (execution.getPerceivedExertion() != null) {
                weightedDifficulty += (execution.getPerceivedExertion() / 2.0) * weight;
            }
            
            totalWeight += weight;
        }
        
        double avgCompletionRate = totalWeight > 0 ? weightedCompletionRate / totalWeight : 0.8;
        double avgDifficulty = totalWeight > 0 ? weightedDifficulty / totalWeight : 3.0;
        
        return new ExerciseProgress(avgCompletionRate, avgDifficulty, executions.size());
    }
    
    // Helper 클래스들과 메서드들 계속...
    
    /**
     * 목표별 운동 풀 구성 - MotionCoach 지원 운동 우선 선택
     */
    private List<String> buildExercisePool(String goal) {
        return switch (goal) {
            case "diet" -> List.of("squat", "pushup", "plank", "lunge", "calf_raise", "burpee", "mountain_climber", "점핑잭", "하이 니즈", "벗 킥스");
            case "strength" -> List.of("squat", "pushup", "plank", "lunge", "calf_raise", "burpee", "턱걸이", "딥스", "데드리프트", "바벨 로우");
            case "body" -> List.of("squat", "pushup", "plank", "lunge", "calf_raise", "mountain_climber", "크런치", "사이드 플랭크", "러시안 트위스트");
            case "fitness" -> List.of("squat", "pushup", "lunge", "plank", "calf_raise", "burpee", "mountain_climber", "점핑잭", "하이 니즈", "스텝업");
            case "stamina" -> List.of("squat", "lunge", "calf_raise", "burpee", "mountain_climber", "제자리 뛰기", "버피 테스트", "점핑잭", "하이 니즈");
            default -> List.of("squat", "pushup", "plank", "lunge", "calf_raise", "burpee", "mountain_climber");
        };
    }
    
    /**
     * 최근 운동 기록 조회
     */
    private List<String> getRecentExercises(User user, int days) {
        LocalDateTime fromDate = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(days);
        List<ExerciseExecution> executions = executionRepository.findByUserOrderBySessionDateDesc(user);
        
        return executions.stream()
                .limit(20) // 최근 20개 운동만
                .map(ExerciseExecution::getExerciseName)
                .distinct()
                .collect(Collectors.toList());
    }
    
    /**
     * 개인화된 팁 생성 (MotionCoach 데이터 반영)
     */
    private List<String> generatePersonalizedTips(User user, UserFitnessProfile profile) {
        List<String> tips = new ArrayList<>();
        
        // MotionCoach 데이터 기반 팁 추가
        List<String> motionCoachTips = generateMotionCoachTips(user);
        tips.addAll(motionCoachTips);
        
        // 피트니스 레벨 기반 팁
        if (profile.getCurrentFitnessLevel() < 0.4) {
            tips.add("💪 천천히 시작하세요. 꾸준함이 가장 중요합니다");
            tips.add("⏰ 무리하지 말고 점진적으로 운동량을 늘려가세요");
        } else if (profile.getCurrentFitnessLevel() > 0.7) {
            tips.add("🔥 높은 수준의 도전을 위해 운동 강도를 조절했습니다");
            tips.add("💫 복합 운동으로 더 큰 효과를 노려보세요");
        }
        
        // 진행 추세 기반 팁
        if (profile.getProgressTrend() < -0.1) {
            tips.add("🎯 새로운 자극을 위해 운동을 변경했습니다");
            tips.add("💪 정체기 극복을 위한 강도 조절을 적용했습니다");
        } else if (profile.getProgressTrend() > 0.2) {
            tips.add("📈 훌륭한 발전을 보이고 있어요! 이 속도를 유지하세요");
        }
        
        // 동기 수준 기반 팁
        if (profile.getMotivationLevel() < 0.5) {
            tips.add("🌟 다양한 운동으로 재미를 더했습니다");
            tips.add("🎵 좋아하는 음악과 함께 운동해보세요");
        }
        
        // 회복 패턴 기반 팁
        if (profile.getRecoveryPattern() < 2.5) {
            tips.add("😴 충분한 휴식이 필요해 보입니다. 휴식 시간을 늘렸어요");
            tips.add("💧 운동 후 스트레칭과 수분 보충을 잊지 마세요");
        }
        
        tips.add("🤖 모션 코치와 함께 운동하면 더 정확한 자세 피드백을 받을 수 있어요");
        tips.add("📊 운동 후 피드백을 남겨주시면 더 정확한 추천이 가능합니다");
        
        return tips;
    }
    
    /**
     * MotionCoach 데이터 기반 팁 생성
     */
    private List<String> generateMotionCoachTips(User user) {
        List<String> tips = new ArrayList<>();
        
        // 최근 30일간의 MotionCoach 데이터 분석
        LocalDateTime fromDate = LocalDateTime.now(ZoneId.of("Asia/Seoul")).minusDays(30);
        List<WorkoutSession> motionCoachSessions = workoutSessionRepository.findRecentSessions(user, fromDate)
                .stream()
                .filter(session -> {
                    SessionFeedback feedback = session.getFeedback();
                    return feedback != null && feedback.getComments() != null && 
                           feedback.getComments().contains("모션 코치");
                })
                .collect(Collectors.toList());
        
        if (motionCoachSessions.isEmpty()) {
            return tips; // MotionCoach 데이터가 없으면 빈 목록 반환
        }
        
        // 전반적인 자세 정확도 분석
        double avgFormAccuracy = motionCoachSessions.stream()
                .map(WorkoutSession::getFeedback)
                .filter(feedback -> feedback != null && feedback.getCompletionRate() != null)
                .mapToDouble(feedback -> feedback.getCompletionRate().doubleValue())
                .average()
                .orElse(0.8);
        
        if (avgFormAccuracy < 0.7) {
            tips.add("🎯 자세 교정에 집중해보세요! 모션 코치의 피드백을 잘 들어보시면 도움이 될 거예요");
            tips.add("📹 거울 앞에서 운동하거나 영상을 찍어보며 자세를 점검해보세요");
        } else if (avgFormAccuracy > 0.9) {
            tips.add("✨ 완벽한 자세! 이제 강도를 조금 더 높여볼 시간이에요");
        }
        
        // 자주 교정받는 운동 분석
        Map<String, Long> formCorrectionCount = new HashMap<>();
        for (WorkoutSession session : motionCoachSessions) {
            SessionFeedback feedback = session.getFeedback();
            if (feedback != null && feedback.getComments() != null && 
                feedback.getComments().contains("자세 교정 포인트")) {
                
                for (ExerciseExecution execution : session.getExerciseExecutions()) {
                    String exerciseName = execution.getExerciseName();
                    formCorrectionCount.put(exerciseName, 
                        formCorrectionCount.getOrDefault(exerciseName, 0L) + 1);
                }
            }
        }
        
        // 가장 교정이 많이 필요한 운동에 대한 팁
        String mostCorrectedExercise = formCorrectionCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);
        
        if (mostCorrectedExercise != null && formCorrectionCount.get(mostCorrectedExercise) >= 3) {
            tips.add("💡 " + mostCorrectedExercise + " 자세에 특별히 신경써보세요. 천천히 정확하게!");
            tips.add("📚 " + mostCorrectedExercise + " 운동 영상을 다시 확인해보시는 것을 추천해요");
        }
        
        // 개선 추세 분석
        List<WorkoutSession> sortedSessions = motionCoachSessions.stream()
                .sorted((a, b) -> a.getSessionDate().compareTo(b.getSessionDate()))
                .collect(Collectors.toList());
        
        if (sortedSessions.size() >= 4) {
            int midPoint = sortedSessions.size() / 2;
            double oldAvg = sortedSessions.subList(0, midPoint).stream()
                    .map(WorkoutSession::getFeedback)
                    .filter(feedback -> feedback != null && feedback.getCompletionRate() != null)
                    .mapToDouble(feedback -> feedback.getCompletionRate().doubleValue())
                    .average()
                    .orElse(0.8);
            double newAvg = sortedSessions.subList(midPoint, sortedSessions.size()).stream()
                    .map(WorkoutSession::getFeedback)
                    .filter(feedback -> feedback != null && feedback.getCompletionRate() != null)
                    .mapToDouble(feedback -> feedback.getCompletionRate().doubleValue())
                    .average()
                    .orElse(0.8);
            
            double improvement = newAvg - oldAvg;
            
            if (improvement > 0.1) {
                tips.add("🚀 모션 코치와 함께 하니 자세가 많이 개선되고 있어요! 계속 화이팅!");
            } else if (improvement < -0.1) {
                tips.add("🤔 최근 자세가 조금 흐트러진 것 같아요. 집중력을 더 높여보세요!");
            }
        }
        
        return tips;
    }
    
    // 나머지 헬퍼 메서드들...
    
    /**
     * 기본 운동 정보 반환
     */
    private Map<String, Object> getBaseExercise(String exerciseName) {
        // 운동별 기본 템플릿 (실제로는 데이터베이스에서 가져와야 함)
        Map<String, Map<String, Object>> exerciseTemplates = Map.of(
                "스쿼트", Map.of("name", "스쿼트", "target", "하체", "sets", 3, "reps", 15, "restSeconds", 60, "mets", 6.0, "hasAICoaching", true),
                "푸시업", Map.of("name", "푸시업", "target", "상체", "sets", 3, "reps", 12, "restSeconds", 90, "mets", 7.0, "hasAICoaching", true),
                "플랭크", Map.of("name", "플랭크", "target", "코어", "sets", 3, "reps", 30, "restSeconds", 60, "mets", 5.0, "hasAICoaching", true),
                "마운틴 클라이머", Map.of("name", "마운틴 클라이머", "target", "전신", "sets", 3, "reps", 20, "restSeconds", 60, "mets", 8.0, "hasAICoaching", true),
                "런지", Map.of("name", "런지", "target", "하체", "sets", 3, "reps", 12, "restSeconds", 90, "mets", 6.5, "hasAICoaching", true),
                "버피 테스트", Map.of("name", "버피 테스트", "target", "전신", "sets", 3, "reps", 8, "restSeconds", 90, "mets", 10.0, "hasAICoaching", false),
                "점핑잭", Map.of("name", "점핑잭", "target", "전신", "sets", 3, "reps", 25, "restSeconds", 60, "mets", 7.0, "hasAICoaching", false)
        );
        
        return exerciseTemplates.getOrDefault(exerciseName, Map.of("name", exerciseName, "target", "전신", "sets", 3, "reps", 15, "restSeconds", 60, "mets", 6.0, "hasAICoaching", false));
    }
    
    private double calculateGoalFitScore(String exerciseName, String goal) {
        // 운동별 목표 적합도 매트릭스 (실제로는 더 정교해야 함)
        Map<String, Map<String, Double>> fitMatrix = Map.of(
                "diet", Map.of("마운틴 클라이머", 0.9, "버피 테스트", 0.95, "점핑잭", 0.8, "스쿼트", 0.7, "푸시업", 0.6),
                "strength", Map.of("푸시업", 0.9, "스쿼트", 0.85, "플랭크", 0.7, "턱걸이", 0.95, "딥스", 0.9),
                "body", Map.of("스쿼트", 0.8, "푸시업", 0.8, "플랭크", 0.9, "런지", 0.8, "크런치", 0.7)
        );
        
        return fitMatrix.getOrDefault(goal, Map.of()).getOrDefault(exerciseName, 0.6);
    }
    
    private double calculateFitnessLevelFit(String exerciseName, double fitnessLevel) {
        // 운동별 권장 피트니스 레벨 (0.0-1.0)
        Map<String, Double> exerciseDifficulty = Map.of(
                "버피 테스트", 0.8, "턱걸이", 0.9, "딥스", 0.8,
                "푸시업", 0.5, "스쿼트", 0.4, "플랭크", 0.6,
                "점핑잭", 0.3, "런지", 0.5, "마운틴 클라이머", 0.7
        );
        
        double exerciseLevel = exerciseDifficulty.getOrDefault(exerciseName, 0.5);
        return 1.0 - Math.abs(fitnessLevel - exerciseLevel);
    }
    
    private double calculateVarietyBonus(User user, String exerciseName) {
        // 최근 수행 빈도가 낮을수록 높은 보너스
        List<String> recentExercises = getRecentExercises(user, 14);
        long frequency = recentExercises.stream().filter(ex -> ex.equals(exerciseName)).count();
        
        if (frequency == 0) return 1.0; // 새로운 운동
        if (frequency <= 2) return 0.7; // 적게 한 운동
        if (frequency <= 4) return 0.3; // 보통
        return 0.0; // 많이 한 운동
    }
    
    private Map<String, Object> createAdaptiveWorkoutPlan(List<Map<String, Object>> exercises, UserFitnessProfile profile) {
        List<Map<String, Object>> warmupExercises = List.of(
                Map.of("name", "제자리 뛰기", "target", "전신", "sets", 1, "reps", 30, "restSeconds", 30, "mets", 3.0, "hasAICoaching", false),
                Map.of("name", "동적 스트레칭", "target", "전신", "sets", 1, "reps", 60, "restSeconds", 0, "mets", 2.0, "hasAICoaching", false)
        );
        
        List<Map<String, Object>> cooldownExercises = List.of(
                Map.of("name", "정적 스트레칭", "target", "전신", "sets", 1, "reps", 120, "restSeconds", 0, "mets", 2.0, "hasAICoaching", false),
                Map.of("name", "심호흡", "target", "전신", "sets", 1, "reps", 60, "restSeconds", 0, "mets", 1.5, "hasAICoaching", false)
        );
        
        Map<String, Object> workoutPlan = new HashMap<>();
        workoutPlan.put("warmup", Map.of("name", "준비운동", "exercises", warmupExercises, "duration", 8));
        workoutPlan.put("main", Map.of("name", "메인운동", "exercises", exercises, "duration", 30));
        workoutPlan.put("cooldown", Map.of("name", "마무리운동", "exercises", cooldownExercises, "duration", 7));
        
        return workoutPlan;
    }
    
    private Map<String, Object> createEnhancedUserProfile(User user, UserFitnessProfile profile) {
        Map<String, Object> enhancedProfile = new HashMap<>();
        enhancedProfile.put("goal", profile.getGoal());
        enhancedProfile.put("experience", profile.getExperienceLevel());
        enhancedProfile.put("fitnessLevel", profile.getFitnessLevelLabel());
        enhancedProfile.put("progressTrend", profile.getProgressTrendLabel());
        enhancedProfile.put("motivationLevel", profile.getMotivationLevelLabel());
        enhancedProfile.put("adaptationInfo", "개인화 적용됨");
        enhancedProfile.put("confidenceScore", Math.round(profile.getConfidenceScore() * 100) + "%");
        
        return enhancedProfile;
    }
    
    private int calculateAdaptiveCalories(List<Map<String, Object>> exercises, User user) {
        final double weight = getUserWeight(user); // Make weight effectively final
        
        return exercises.stream()
                .mapToInt(exercise -> {
                    double mets = (Double) exercise.get("mets");
                    int sets = (Integer) exercise.get("sets");
                    int reps = (Integer) exercise.get("reps");
                    
                    double exerciseTimeMinutes = (sets * reps * 2) / 60.0; // 2초/회 가정
                    double caloriesPerMinute = (mets * weight * 3.5) / 200;
                    return (int) (caloriesPerMinute * exerciseTimeMinutes);
                })
                .sum();
    }
    
    /**
     * 사용자 체중 조회 헬퍼 메서드
     */
    private double getUserWeight(User user) {
        double weight = 70.0; // 기본값
        if (user.getWeight() != null && !user.getWeight().isEmpty()) {
            try {
                weight = Double.parseDouble(user.getWeight());
            } catch (NumberFormatException ignored) {
                // 기본값 사용
            }
        }
        return weight;
    }
    
    private Map<String, Object> createAdaptationInfo(UserFitnessProfile profile) {
        Map<String, Object> info = new HashMap<>();
        info.put("adaptationFactor", profile.getAdaptationFactor());
        info.put("confidenceLevel", profile.getConfidenceScore() >= 0.7 ? "높음" : profile.getConfidenceScore() >= 0.4 ? "보통" : "낮음");
        info.put("recommendationType", profile.getConfidenceScore() >= 0.5 ? "개인화 추천" : "일반 추천");
        info.put("learningStatus", profile.getConfidenceScore() >= 0.7 ? "충분한 학습" : "학습 중");
        
        return info;
    }
    
    private String generateExerciseTip(User user, String exerciseName, double adaptationFactor) {
        if (adaptationFactor > 0.1) {
            return "이전보다 조금 더 도전적으로 설정했어요! 💪";
        } else if (adaptationFactor < -0.1) {
            return "무리하지 않게 강도를 조절했어요 😊";
        } else {
            return "현재 수준에 맞게 설정했어요 👍";
        }
    }
    
    // 내부 클래스들
    private record ScoredExercise(String exerciseName, double score) {}
    private record ExerciseProgress(double averageCompletionRate, double averageDifficulty, int dataPoints) {}
    private record MotionCoachMetrics(double avgCompletionRate, double avgFormAccuracy, double improvementTrend, int dataPoints) {}
}