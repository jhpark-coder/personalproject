package backend.fitmate.service;

import java.time.LocalDateTime;
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

import backend.fitmate.User.entity.ExerciseExecution;
import backend.fitmate.User.entity.SessionFeedback;
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.UserExercisePreference;
import backend.fitmate.User.entity.WorkoutSession;
import backend.fitmate.User.repository.ExerciseExecutionRepository;
import backend.fitmate.User.repository.UserExercisePreferenceRepository;
import backend.fitmate.User.repository.WorkoutSessionRepository;
import backend.fitmate.dto.UserFitnessProfile;
import lombok.extern.slf4j.Slf4j;

/**
 * 적응형 운동 추천 서비스
 * 사용자 피드백과 선호도를 학습하여 개인화된 운동을 추천
 */
@Service
@Slf4j
@Transactional(readOnly = true)
public class AdaptiveWorkoutRecommendationService {
    
    @Autowired
    private UserFitnessProfileService profileService;
    
    @Autowired
    private UserExercisePreferenceService preferenceService;
    
    @Autowired
    private ExerciseExecutionRepository executionRepository;
    
    @Autowired
    private UserExercisePreferenceRepository preferenceRepository;
    
    @Autowired
    private WorkoutSessionRepository workoutSessionRepository;
    
    /**
     * 적응형 운동 추천 생성 - 강화된 피드백 기반 학습
     */
    public Map<String, Object> generateAdaptiveRecommendation(User user, Map<String, Object> requestData) {
        log.info("적응형 운동 추천 생성 시작: userId={}", user.getId());
        
        // 사용자 피트니스 프로필 계산
        UserFitnessProfile profile = profileService.calculateProfile(user);
        
        // 최근 피드백 데이터 분석
        FeedbackAnalysis feedbackAnalysis = analyzeFeedbackHistory(user, 14); // 최근 2주
        
        // 요청 데이터에서 목표와 시간 추출 (피드백 기반 조정 적용)
        String goal = (String) requestData.getOrDefault("goal", user.getGoal() != null ? user.getGoal() : "diet");
        Integer baseDuration = Integer.parseInt(requestData.getOrDefault("targetDuration", "45").toString());
        Integer adjustedDuration = adjustDurationBasedOnFeedback(baseDuration, feedbackAnalysis);
        
        // 적응형 운동 선택 (피드백 데이터 반영)
        List<Map<String, Object>> selectedExercises = selectAdaptiveExercisesWithFeedback(user, profile, goal, adjustedDuration, feedbackAnalysis);
        
        // 운동 계획 구성
        Map<String, Object> workoutPlan = createAdaptiveWorkoutPlan(selectedExercises, profile);
        
        // 추천 결과 구성
        Map<String, Object> recommendation = new HashMap<>();
        recommendation.put("userProfile", createEnhancedUserProfile(user, profile));
        recommendation.put("workoutPlan", workoutPlan);
        recommendation.put("estimatedCalories", calculateAdaptiveCalories(selectedExercises, user));
        recommendation.put("totalDuration", adjustedDuration);
        recommendation.put("recommendations", generatePersonalizedTipsWithFeedback(user, profile, feedbackAnalysis));
        recommendation.put("adaptationInfo", createAdaptationInfo(profile));
        recommendation.put("feedbackInsights", createFeedbackInsights(feedbackAnalysis));
        
        log.info("적응형 운동 추천 완료: userId={}, 신뢰도={}, 추천운동수={}, 피드백분석={}회", 
                user.getId(), profile.getConfidenceScore(), selectedExercises.size(), feedbackAnalysis.totalSessions());
        
        return recommendation;
    }
    
    /**
     * 적응형 운동 선택 알고리즘
     */
    private List<Map<String, Object>> selectAdaptiveExercises(User user, UserFitnessProfile profile, String goal, int targetDuration) {
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
        
        // 운동 선택 (균형과 다양성 고려)
        Map<String, Integer> targetCounts = Map.of(
                "상체", 2, "하체", 2, "코어", 1, "전신", 2
        );
        Map<String, Integer> currentCounts = new HashMap<>();
        
        for (ScoredExercise scored : scoredExercises) {
            if (selectedExercises.size() >= 7) break; // 최대 7개 운동
            
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
            
            if (currentCount < targetCount || selectedExercises.size() < 5) {
                selectedExercises.add(exercise);
                currentCounts.put(target, currentCount + 1);
            }
        }
        
        // 최소 5개 운동 보장
        while (selectedExercises.size() < 5 && !candidateExercises.isEmpty()) {
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
        LocalDateTime fromDate = LocalDateTime.now().minusDays(30); // 최근 30일
        List<WorkoutSession> sessions = workoutSessionRepository.findByUserAndSessionDateAfter(user, fromDate);
        
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
     * MotionCoach 점수 계산
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
     * 세션 피드백 점수 계산
     */
    private double calculateSessionFeedbackScore(User user, String exerciseName) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(21); // 최근 3주
        List<WorkoutSession> sessions = workoutSessionRepository.findByUserAndSessionDateAfter(user, fromDate);
        
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
        LocalDateTime fromDate = LocalDateTime.now().minusDays(21); // 최근 3주
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
            case "diet" -> List.of("squat", "pushup", "plank", "lunge", "calf_raise", "점핑잭", "마운틴 클라이머");
            case "strength" -> List.of("squat", "pushup", "plank", "lunge", "턱걸이", "딥스", "데드리프트");
            case "body" -> List.of("squat", "pushup", "plank", "lunge", "calf_raise", "크런치", "사이드 플랭크");
            case "fitness" -> List.of("squat", "pushup", "lunge", "plank", "calf_raise", "점핑잭", "마운틴 클라이머");
            case "stamina" -> List.of("squat", "lunge", "calf_raise", "제자리 뛰기", "마운틴 클라이머", "버피 테스트");
            default -> List.of("squat", "pushup", "plank", "lunge", "calf_raise");
        };
    }
    
    /**
     * 최근 운동 기록 조회
     */
    private List<String> getRecentExercises(User user, int days) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(days);
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
        LocalDateTime fromDate = LocalDateTime.now().minusDays(30);
        List<WorkoutSession> motionCoachSessions = workoutSessionRepository.findByUserAndSessionDateAfter(user, fromDate)
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
    
    /**
     * 피드백 히스토리 분석
     */
    private FeedbackAnalysis analyzeFeedbackHistory(User user, int days) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(days);
        List<WorkoutSession> recentSessions = workoutSessionRepository.findByUserAndSessionDateAfter(user, fromDate);
        
        List<SessionFeedback> feedbacks = recentSessions.stream()
                .map(WorkoutSession::getFeedback)
                .filter(feedback -> feedback != null)
                .collect(Collectors.toList());
        
        if (feedbacks.isEmpty()) {
            return new FeedbackAnalysis(0.0, 3.0, 3.0, 0.0, 0, new HashMap<>(), new HashMap<>());
        }
        
        // 평균 만족도
        double avgSatisfaction = feedbacks.stream()
                .filter(f -> f.getSatisfaction() != null)
                .mapToInt(SessionFeedback::getSatisfaction)
                .average()
                .orElse(3.0);
        
        // 평균 난이도
        double avgDifficulty = feedbacks.stream()
                .filter(f -> f.getOverallDifficulty() != null)
                .mapToInt(SessionFeedback::getOverallDifficulty)
                .average()
                .orElse(3.0);
        
        // 평균 완료율
        double avgCompletionRate = feedbacks.stream()
                .filter(f -> f.getCompletionRate() != null)
                .mapToDouble(f -> f.getCompletionRate().doubleValue())
                .average()
                .orElse(0.8);
        
        // 재선택 의향 비율
        double wouldRepeatRatio = feedbacks.stream()
                .filter(f -> f.getWouldRepeat() != null)
                .mapToDouble(f -> f.getWouldRepeat() ? 1.0 : 0.0)
                .average()
                .orElse(0.8);
        
        // 운동별 성과 맵
        Map<String, Double> exercisePerformance = new HashMap<>();
        Map<String, Integer> exerciseCounts = new HashMap<>();
        
        for (WorkoutSession session : recentSessions) {
            for (ExerciseExecution execution : session.getExerciseExecutions()) {
                String exerciseName = execution.getExerciseName();
                double performance = execution.getCompletionRate() != null ? execution.getCompletionRate() : 0.8;
                
                exercisePerformance.merge(exerciseName, performance, Double::sum);
                exerciseCounts.merge(exerciseName, 1, Integer::sum);
            }
        }
        
        // 평균 성과 계산
        Map<String, Double> avgExercisePerformance = new HashMap<>();
        for (String exercise : exercisePerformance.keySet()) {
            double totalPerf = exercisePerformance.get(exercise);
            int count = exerciseCounts.get(exercise);
            avgExercisePerformance.put(exercise, totalPerf / count);
        }
        
        return new FeedbackAnalysis(avgSatisfaction, avgDifficulty, avgCompletionRate, 
                wouldRepeatRatio, feedbacks.size(), avgExercisePerformance, exerciseCounts);
    }
    
    /**
     * 피드백 기반 운동 시간 조정
     */
    private Integer adjustDurationBasedOnFeedback(Integer baseDuration, FeedbackAnalysis feedbackAnalysis) {
        if (feedbackAnalysis.totalSessions() < 2) {
            return baseDuration; // 데이터 부족시 조정 없음
        }
        
        double adjustmentFactor = 0.0;
        
        // 난이도가 계속 어렵다고 평가되면 시간 단축
        if (feedbackAnalysis.avgDifficulty() >= 4.0) {
            adjustmentFactor -= 0.15; // 15% 단축
        } else if (feedbackAnalysis.avgDifficulty() <= 2.0) {
            adjustmentFactor += 0.1; // 10% 연장
        }
        
        // 완료율이 낮으면 시간 단축
        if (feedbackAnalysis.avgCompletionRate() < 0.7) {
            adjustmentFactor -= 0.1; // 10% 단축
        } else if (feedbackAnalysis.avgCompletionRate() > 0.95) {
            adjustmentFactor += 0.05; // 5% 연장
        }
        
        // 만족도가 낮으면 조정
        if (feedbackAnalysis.avgSatisfaction() < 2.5) {
            adjustmentFactor -= 0.1; // 부담 줄이기
        }
        
        int adjustedDuration = (int) Math.round(baseDuration * (1.0 + adjustmentFactor));
        return Math.max(15, Math.min(60, adjustedDuration)); // 15-60분 범위 제한
    }
    
    /**
     * 피드백 데이터를 반영한 적응형 운동 선택
     */
    private List<Map<String, Object>> selectAdaptiveExercisesWithFeedback(User user, UserFitnessProfile profile, 
            String goal, Integer targetDuration, FeedbackAnalysis feedbackAnalysis) {
        
        // 기본 운동 선택 로직 실행
        List<Map<String, Object>> baseExercises = selectAdaptiveExercises(user, profile, goal, targetDuration);
        
        // 피드백 기반 운동 조정
        return baseExercises.stream()
                .map(exercise -> adjustExerciseBasedOnFeedback(exercise, feedbackAnalysis))
                .collect(Collectors.toList());
    }
    
    /**
     * 개별 운동을 피드백 기반으로 조정
     */
    private Map<String, Object> adjustExerciseBasedOnFeedback(Map<String, Object> exercise, FeedbackAnalysis feedbackAnalysis) {
        String exerciseName = (String) exercise.get("name");
        
        // 해당 운동의 과거 성과 확인
        Double pastPerformance = feedbackAnalysis.exercisePerformance().get(exerciseName);
        Integer pastCount = feedbackAnalysis.exerciseCounts().get(exerciseName);
        
        Map<String, Object> adjustedExercise = new HashMap<>(exercise);
        
        if (pastPerformance != null && pastCount != null && pastCount >= 2) {
            // 성과가 좋았던 운동은 난이도 증가
            if (pastPerformance > 0.9) {
                int currentSets = (Integer) adjustedExercise.get("sets");
                int currentReps = (Integer) adjustedExercise.get("reps");
                adjustedExercise.put("sets", Math.min(currentSets + 1, 5));
                adjustedExercise.put("reps", Math.min((int)(currentReps * 1.1), 25));
                adjustedExercise.put("personalizedTip", "이전에 잘 했던 운동이에요! 조금 더 도전해보세요 💪");
            }
            // 성과가 나빴던 운동은 난이도 감소
            else if (pastPerformance < 0.6) {
                int currentSets = (Integer) adjustedExercise.get("sets");
                int currentReps = (Integer) adjustedExercise.get("reps");
                adjustedExercise.put("sets", Math.max(currentSets - 1, 2));
                adjustedExercise.put("reps", Math.max((int)(currentReps * 0.9), 8));
                adjustedExercise.put("personalizedTip", "이번엔 좀 더 편안하게 시작해보세요 😊");
            }
        }
        
        return adjustedExercise;
    }
    
    /**
     * 피드백 기반 개인화된 팁 생성
     */
    private List<String> generatePersonalizedTipsWithFeedback(User user, UserFitnessProfile profile, FeedbackAnalysis feedbackAnalysis) {
        List<String> tips = new ArrayList<>();
        
        // 기본 개인화된 팁 추가
        tips.addAll(generatePersonalizedTips(user, profile));
        
        // 피드백 기반 추가 팁
        if (feedbackAnalysis.totalSessions() >= 3) {
            // 만족도 기반 팁
            if (feedbackAnalysis.avgSatisfaction() >= 4.0) {
                tips.add("🌟 최근 운동 만족도가 높네요! 이 페이스를 유지하세요");
            } else if (feedbackAnalysis.avgSatisfaction() < 2.5) {
                tips.add("🤔 운동이 맞지 않는 것 같아요. 오늘은 다른 스타일을 시도해보세요");
            }
            
            // 난이도 기반 팁
            if (feedbackAnalysis.avgDifficulty() >= 4.5) {
                tips.add("😅 최근 운동이 힘드셨나요? 오늘은 강도를 조금 낮췄어요");
            } else if (feedbackAnalysis.avgDifficulty() <= 2.0) {
                tips.add("💪 준비되셨나요? 이번엔 조금 더 도전적으로 구성했어요");
            }
            
            // 완주율 기반 팁
            if (feedbackAnalysis.avgCompletionRate() < 0.7) {
                tips.add("🎯 완주에 집중해보세요. 세트 수를 줄이고 정확하게!");
            } else if (feedbackAnalysis.avgCompletionRate() > 0.95) {
                tips.add("🏆 완벽한 완주율! 이제 강도를 높일 때입니다");
            }
        }
        
        return tips;
    }
    
    /**
     * 피드백 인사이트 생성
     */
    private Map<String, Object> createFeedbackInsights(FeedbackAnalysis feedbackAnalysis) {
        Map<String, Object> insights = new HashMap<>();
        
        if (feedbackAnalysis.totalSessions() >= 2) {
            insights.put("recentSatisfaction", String.format("%.1f/5.0", feedbackAnalysis.avgSatisfaction()));
            insights.put("difficultyTrend", getDifficultyTrendLabel(feedbackAnalysis.avgDifficulty()));
            insights.put("completionTrend", String.format("%.1f%%", feedbackAnalysis.avgCompletionRate() * 100));
            insights.put("motivationLevel", feedbackAnalysis.wouldRepeatRatio() > 0.8 ? "높음" : 
                                          feedbackAnalysis.wouldRepeatRatio() > 0.5 ? "보통" : "낮음");
            
            // 가장 성과가 좋았던 운동
            String bestExercise = feedbackAnalysis.exercisePerformance().entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse(null);
            if (bestExercise != null) {
                insights.put("bestPerformingExercise", bestExercise);
            }
        } else {
            insights.put("message", "더 많은 운동 기록이 있으면 더 정확한 분석이 가능해요!");
        }
        
        return insights;
    }
    
    private String getDifficultyTrendLabel(double avgDifficulty) {
        if (avgDifficulty >= 4.0) return "최근 운동이 어려워요";
        else if (avgDifficulty <= 2.0) return "더 도전할 준비 됐어요";
        else return "적절한 난이도 유지 중";
    }

    // 내부 클래스들
    private record ScoredExercise(String exerciseName, double score) {}
    private record ExerciseProgress(double averageCompletionRate, double averageDifficulty, int dataPoints) {}
    private record MotionCoachMetrics(double avgCompletionRate, double avgFormAccuracy, double improvementTrend, int dataPoints) {}
    private record FeedbackAnalysis(double avgSatisfaction, double avgDifficulty, double avgCompletionRate, 
            double wouldRepeatRatio, int totalSessions, Map<String, Double> exercisePerformance, Map<String, Integer> exerciseCounts) {}
}