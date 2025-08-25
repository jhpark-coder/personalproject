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
import backend.fitmate.User.entity.User;
import backend.fitmate.User.entity.UserExercisePreference;
import backend.fitmate.User.repository.ExerciseExecutionRepository;
import backend.fitmate.User.repository.UserExercisePreferenceRepository;
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
    
    /**
     * 적응형 운동 추천 생성
     */
    public Map<String, Object> generateAdaptiveRecommendation(User user, Map<String, Object> requestData) {
        log.info("적응형 운동 추천 생성 시작: userId={}", user.getId());
        
        // 사용자 피트니스 프로필 계산
        UserFitnessProfile profile = profileService.calculateProfile(user);
        
        // 요청 데이터에서 목표와 시간 추출
        String goal = (String) requestData.getOrDefault("goal", user.getGoal() != null ? user.getGoal() : "diet");
        Integer targetDuration = Integer.parseInt(requestData.getOrDefault("targetDuration", "45").toString());
        
        // 적응형 운동 선택
        List<Map<String, Object>> selectedExercises = selectAdaptiveExercises(user, profile, goal, targetDuration);
        
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
        
        log.info("적응형 운동 추천 완료: userId={}, 신뢰도={}, 추천운동수={}", 
                user.getId(), profile.getConfidenceScore(), selectedExercises.size());
        
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
     * 운동별 점수 계산
     */
    private ScoredExercise calculateExerciseScore(User user, UserFitnessProfile profile, String exerciseName, String goal) {
        double score = 0.0;
        
        // 1. 목표 적합도 (30%)
        score += calculateGoalFitScore(exerciseName, goal) * 0.3;
        
        // 2. 개인 선호도 (25%)
        Double preferenceScore = preferenceService.getPreferenceScore(user, exerciseName);
        Double confidenceScore = preferenceService.getConfidenceScore(user, exerciseName);
        if (confidenceScore > 0.3) { // 신뢰할 수 있는 데이터가 있는 경우만
            score += preferenceScore * 0.25;
        } else {
            score += 0.0; // 중립
        }
        
        // 3. 피트니스 레벨 적합도 (20%)
        score += calculateFitnessLevelFit(exerciseName, profile.getCurrentFitnessLevel()) * 0.2;
        
        // 4. 효과도 (15%)
        Double effectivenessScore = preferenceService.getEffectivenessScore(user, exerciseName);
        score += (effectivenessScore - 0.5) * 2.0 * 0.15; // 0.5를 중립으로 정규화
        
        // 5. 다양성 보너스 (10%)
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
     * 운동별 진행도 계산
     */
    private ExerciseProgress getExerciseProgress(User user, String exerciseName) {
        LocalDateTime fromDate = LocalDateTime.now().minusDays(21); // 최근 3주
        List<ExerciseExecution> executions = executionRepository.findRecentExerciseExecutions(user, exerciseName, fromDate);
        
        if (executions.isEmpty()) {
            return new ExerciseProgress(0.8, 3.0, 0); // 기본값
        }
        
        double avgCompletionRate = executions.stream()
                .mapToDouble(ExerciseExecution::getCompletionRate)
                .average()
                .orElse(0.8);
        
        double avgDifficulty = executions.stream()
                .filter(e -> e.getPerceivedExertion() != null)
                .mapToDouble(e -> e.getPerceivedExertion() / 2.0) // RPE를 1-5 스케일로 변환
                .average()
                .orElse(3.0);
        
        return new ExerciseProgress(avgCompletionRate, avgDifficulty, executions.size());
    }
    
    // Helper 클래스들과 메서드들 계속...
    
    /**
     * 목표별 운동 풀 구성
     */
    private List<String> buildExercisePool(String goal) {
        return switch (goal) {
            case "diet" -> List.of("스쿼트", "푸시업", "플랭크", "마운틴 클라이머", "런지", "버피 테스트", "점핑잭");
            case "strength" -> List.of("스쿼트", "푸시업", "플랭크", "턱걸이", "딥스", "런지", "데드리프트");
            case "body" -> List.of("스쿼트", "푸시업", "플랭크", "마운틴 클라이머", "런지", "크런치", "사이드 플랭크");
            case "fitness" -> List.of("버피 테스트", "점프 스쿼트", "마운틴 클라이머", "하이 니즈", "점핑잭", "스쿼트", "푸시업");
            case "stamina" -> List.of("제자리 뛰기", "마운틴 클라이머", "버피 테스트", "줄넘기", "계단 오르기", "스쿼트", "런지");
            default -> List.of("스쿼트", "푸시업", "플랭크", "마운틴 클라이머", "런지");
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
     * 개인화된 팁 생성
     */
    private List<String> generatePersonalizedTips(User user, UserFitnessProfile profile) {
        List<String> tips = new ArrayList<>();
        
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
        
        tips.add("📊 운동 후 피드백을 남겨주시면 더 정확한 추천이 가능합니다");
        
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
}