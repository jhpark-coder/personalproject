package backend.fitmate.service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import backend.fitmate.Exercise.entity.Exercise;
import backend.fitmate.Exercise.service.ExerciseService;

@Service
public class WorkoutRecommendationService {

    @Autowired
    private ExerciseService exerciseService;
    
    private final Random random = new Random();

    public Map<String, Object> generateRecommendation(Map<String, Object> userData) {
        // 사용자 데이터 추출
        String goal = (String) userData.getOrDefault("goal", "diet");
        String experience = (String) userData.getOrDefault("experience", "beginner");
        Double weight = Double.parseDouble(userData.getOrDefault("weight", "70").toString());
        Double height = Double.parseDouble(userData.getOrDefault("height", "170").toString());
        Integer age = Integer.parseInt(userData.getOrDefault("age", "25").toString());
        
        // BMI 계산
        double heightInMeters = height / 100.0;
        double bmi = weight / (heightInMeters * heightInMeters);
        
        // 운동 추천 로직
        Map<String, Object> workoutPlan = createWorkoutPlan(goal, experience, bmi, age);
        
        // 칼로리 계산
        int estimatedCalories = calculateEstimatedCalories(workoutPlan, weight);
        
        Map<String, Object> recommendation = new HashMap<>();
        recommendation.put("userProfile", createUserProfile(userData, bmi));
        recommendation.put("workoutPlan", workoutPlan);
        recommendation.put("estimatedCalories", estimatedCalories);
        recommendation.put("totalDuration", calculateTotalDuration(workoutPlan));
        recommendation.put("recommendations", getPersonalizedTips(goal, experience, bmi));
        
        return recommendation;
    }

    private Map<String, Object> createUserProfile(Map<String, Object> userData, double bmi) {
        Map<String, Object> profile = new HashMap<>();
        profile.put("goal", userData.get("goal"));
        profile.put("experience", userData.get("experience"));
        profile.put("bmi", Math.round(bmi * 10.0) / 10.0);
        profile.put("bmiCategory", getBMICategory(bmi));
        profile.put("fitnessLevel", getFitnessLevel((String) userData.get("experience"), bmi));
        return profile;
    }

    private Map<String, Object> createWorkoutPlan(String goal, String experience, double bmi, int age) {
        Map<String, Object> workoutPlan = new HashMap<>();
        
        // 기본 운동 세트 구성
        List<Map<String, Object>> warmupExercises = getWarmupExercises();
        List<Map<String, Object>> mainExercises = getMainExercises(goal, experience, bmi);
        List<Map<String, Object>> cooldownExercises = getCooldownExercises();
        
        workoutPlan.put("warmup", createPhase("준비운동", warmupExercises, 10));
        workoutPlan.put("main", createPhase("메인운동", mainExercises, 35));
        workoutPlan.put("cooldown", createPhase("마무리운동", cooldownExercises, 10));
        
        return workoutPlan;
    }

    private Map<String, Object> createPhase(String name, List<Map<String, Object>> exercises, int duration) {
        Map<String, Object> phase = new HashMap<>();
        phase.put("name", name);
        phase.put("exercises", exercises);
        phase.put("duration", duration);
        return phase;
    }

    private List<Map<String, Object>> getWarmupExercises() {
        List<Map<String, Object>> warmup = new ArrayList<>();
        
        warmup.add(createExercise("제자리 뛰기", "전신", 1, 30, 30, 3.0));
        warmup.add(createExercise("스트레칭", "전신", 1, 60, 0, 2.0));
        warmup.add(createExercise("팔 돌리기", "상체", 1, 30, 30, 2.5));
        
        return warmup;
    }

    private List<Map<String, Object>> getMainExercises(String goal, String experience, double bmi) {
        List<Map<String, Object>> mainExercises = new ArrayList<>();
        
        // 목표별 운동 구성
        switch (goal) {
            case "diet":
                mainExercises = getDietExercises(experience);
                break;
            case "strength":
                mainExercises = getStrengthExercises(experience);
                break;
            case "body":
                mainExercises = getBodyExercises(experience);
                break;
            case "fitness":
                mainExercises = getFitnessExercises(experience);
                break;
            case "stamina":
                mainExercises = getStaminaExercises(experience);
                break;
            default:
                mainExercises = getDietExercises(experience);
        }
        
        return mainExercises;
    }

    private List<Map<String, Object>> getDietExercises(String experience) {
        List<Map<String, Object>> exercises = new ArrayList<>();
        
        int sets = getBaseSets(experience);
        
        exercises.add(createExercise("스쿼트", "하체", sets, getCardioReps(experience), 60, 6.0));
        exercises.add(createExercise("푸시업", "상체", sets, getStrengthReps(experience, "MEDIUM"), 90, 7.0));
        exercises.add(createExercise("플랭크", "코어", sets, 30, 60, 5.0));
        exercises.add(createExercise("마운틴 클라이머", "전신", sets, getCardioReps(experience), 60, 8.0));
        exercises.add(createExercise("런지", "하체", sets, getStrengthReps(experience, "MEDIUM"), 90, 6.5));
        
        return exercises;
    }

    private List<Map<String, Object>> getStrengthExercises(String experience) {
        List<Map<String, Object>> exercises = new ArrayList<>();
        
        int sets = getBaseSets(experience);
        
        exercises.add(createExercise("스쿼트", "하체", sets, getStrengthReps(experience, "HIGH"), 120, 7.0));
        exercises.add(createExercise("푸시업", "상체", sets, getStrengthReps(experience, "HIGH"), 120, 8.0));
        exercises.add(createExercise("플랭크", "코어", sets, 45, 90, 5.0));
        exercises.add(createExercise("턱걸이", "상체", sets, getStrengthReps(experience, "HIGH"), 150, 8.5));
        exercises.add(createExercise("딥스", "상체", sets, getStrengthReps(experience, "HIGH"), 120, 8.0));
        
        return exercises;
    }

    private List<Map<String, Object>> getBodyExercises(String experience) {
        List<Map<String, Object>> exercises = new ArrayList<>();
        
        int sets = getBaseSets(experience);
        
        exercises.add(createExercise("스쿼트", "하체", sets, getStrengthReps(experience, "MEDIUM"), 90, 6.5));
        exercises.add(createExercise("푸시업", "상체", sets, getStrengthReps(experience, "MEDIUM"), 90, 7.0));
        exercises.add(createExercise("플랭크", "코어", sets, 35, 75, 5.0));
        exercises.add(createExercise("마운틴 클라이머", "전신", sets, getCardioReps(experience), 75, 7.5));
        exercises.add(createExercise("런지", "하체", sets, getStrengthReps(experience, "MEDIUM"), 90, 6.5));
        exercises.add(createExercise("크런치", "복근", sets, getStrengthReps(experience, "MEDIUM"), 75, 4.5));
        
        return exercises;
    }

    private List<Map<String, Object>> getFitnessExercises(String experience) {
        List<Map<String, Object>> exercises = new ArrayList<>();
        
        int sets = getBaseSets(experience);
        
        exercises.add(createExercise("버피 테스트", "전신", sets, getCardioReps(experience) / 2, 90, 10.0));
        exercises.add(createExercise("점프 스쿼트", "하체", sets, getCardioReps(experience), 75, 8.0));
        exercises.add(createExercise("마운틴 클라이머", "전신", sets, getCardioReps(experience), 75, 8.0));
        exercises.add(createExercise("하이 니즈", "전신", sets, getCardioReps(experience), 75, 7.5));
        exercises.add(createExercise("점핑잭", "전신", sets, getCardioReps(experience), 60, 7.0));
        
        return exercises;
    }

    private List<Map<String, Object>> getStaminaExercises(String experience) {
        List<Map<String, Object>> exercises = new ArrayList<>();
        
        int sets = getBaseSets(experience);
        
        exercises.add(createExercise("제자리 뛰기", "전신", sets, getCardioReps(experience) * 2, 60, 8.0));
        exercises.add(createExercise("마운틴 클라이머", "전신", sets, getCardioReps(experience) * 2, 60, 8.5));
        exercises.add(createExercise("버피 테스트", "전신", sets, getCardioReps(experience), 90, 10.0));
        exercises.add(createExercise("줄넘기", "전신", sets, getCardioReps(experience) * 3, 75, 9.0));
        exercises.add(createExercise("계단 오르기", "하체", sets, 60, 90, 8.5));
        
        return exercises;
    }

    private List<Map<String, Object>> getCooldownExercises() {
        List<Map<String, Object>> cooldown = new ArrayList<>();
        
        cooldown.add(createExercise("스트레칭", "전신", 1, 120, 0, 2.0));
        cooldown.add(createExercise("폼롤러", "전신", 1, 180, 0, 2.5));
        
        return cooldown;
    }

    private Map<String, Object> createExercise(String name, String target, int sets, int reps, int rest, double mets) {
        Map<String, Object> exercise = new HashMap<>();
        exercise.put("name", name);
        exercise.put("target", target);
        exercise.put("sets", sets);
        exercise.put("reps", reps);
        exercise.put("restSeconds", rest);
        exercise.put("mets", mets);
        exercise.put("hasAICoaching", isAISupported(name));
        return exercise;
    }

    private boolean isAISupported(String exerciseName) {
        List<String> aiSupported = Arrays.asList("스쿼트", "런지", "푸시업", "플랭크", "카프 레이즈", "버피", "마운틴 클라이머");
        return aiSupported.contains(exerciseName);
    }

    private int getBaseSets(String experience) {
        switch (experience) {
            case "beginner": return 3;
            case "intermediate": return 4;
            case "advanced": return 5;
            default: return 3;
        }
    }

    private int getCardioReps(String experience) {
        switch (experience) {
            case "beginner": return 20;
            case "intermediate": return 30;
            case "advanced": return 45;
            default: return 20;
        }
    }

    private int getStrengthReps(String experience, String intensity) {
        Map<String, Integer> beginnerReps = Map.of("LOW", 12, "MEDIUM", 10, "HIGH", 8);
        Map<String, Integer> intermediateReps = Map.of("LOW", 15, "MEDIUM", 12, "HIGH", 10);
        Map<String, Integer> advancedReps = Map.of("LOW", 18, "MEDIUM", 15, "HIGH", 12);
        
        switch (experience) {
            case "intermediate": return intermediateReps.get(intensity);
            case "advanced": return advancedReps.get(intensity);
            default: return beginnerReps.get(intensity);
        }
    }

    private int calculateEstimatedCalories(Map<String, Object> workoutPlan, double weight) {
        int totalCalories = 0;
        
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> allExercises = new ArrayList<>();
        allExercises.addAll((List<Map<String, Object>>) ((Map<String, Object>) workoutPlan.get("warmup")).get("exercises"));
        allExercises.addAll((List<Map<String, Object>>) ((Map<String, Object>) workoutPlan.get("main")).get("exercises"));
        allExercises.addAll((List<Map<String, Object>>) ((Map<String, Object>) workoutPlan.get("cooldown")).get("exercises"));
        
        for (Map<String, Object> exercise : allExercises) {
            double mets = (Double) exercise.get("mets");
            int sets = (Integer) exercise.get("sets");
            int reps = (Integer) exercise.get("reps");
            
            // 대략적인 운동 시간 계산 (초 단위)
            double exerciseTimeMinutes = (sets * reps * 2) / 60.0; // 2초/회 가정
            double caloriesPerMinute = (mets * weight * 3.5) / 200;
            totalCalories += (int) (caloriesPerMinute * exerciseTimeMinutes);
        }
        
        return totalCalories;
    }

    private int calculateTotalDuration(Map<String, Object> workoutPlan) {
        @SuppressWarnings("unchecked")
        int warmupDuration = (Integer) ((Map<String, Object>) workoutPlan.get("warmup")).get("duration");
        @SuppressWarnings("unchecked")
        int mainDuration = (Integer) ((Map<String, Object>) workoutPlan.get("main")).get("duration");
        @SuppressWarnings("unchecked")
        int cooldownDuration = (Integer) ((Map<String, Object>) workoutPlan.get("cooldown")).get("duration");
        
        return warmupDuration + mainDuration + cooldownDuration;
    }

    private String getBMICategory(double bmi) {
        if (bmi < 18.5) return "저체중";
        else if (bmi < 25.0) return "정상";
        else if (bmi < 30.0) return "과체중";
        else return "비만";
    }

    private String getFitnessLevel(String experience, double bmi) {
        double experienceScore = experience.equals("beginner") ? 0.3 : 
                                experience.equals("intermediate") ? 0.6 : 1.0;
        double bmiScore = (bmi >= 18.5 && bmi < 25.0) ? 1.0 : 0.8;
        
        double totalScore = experienceScore * bmiScore;
        
        if (totalScore >= 0.8) return "우수";
        else if (totalScore >= 0.6) return "양호";
        else if (totalScore >= 0.4) return "보통";
        else return "개선필요";
    }

    private List<String> getPersonalizedTips(String goal, String experience, double bmi) {
        List<String> tips = new ArrayList<>();
        
        // 목표별 팁
        switch (goal) {
            case "diet":
                tips.add("💡 다이어트를 위해서는 꾸준한 유산소 운동이 중요합니다");
                tips.add("🍎 운동과 함께 균형잡힌 식단을 유지하세요");
                break;
            case "strength":
                tips.add("💪 근력 향상을 위해 점진적으로 강도를 높여가세요");
                tips.add("🥛 충분한 단백질 섭취를 잊지 마세요");
                break;
            case "body":
                tips.add("🏃‍♂️ 근력과 유산소를 균형있게 실시하세요");
                tips.add("💤 충분한 휴식과 수면이 몸매 관리에 도움됩니다");
                break;
        }
        
        // 경험별 팁
        if (experience.equals("beginner")) {
            tips.add("🌱 초보자는 정확한 자세가 가장 중요합니다");
            tips.add("⏰ 무리하지 말고 점진적으로 운동량을 늘려가세요");
        }
        
        // BMI별 팁
        if (bmi > 25.0) {
            tips.add("🚶‍♂️ 관절 부담을 줄이는 저강도 운동부터 시작하세요");
        }
        
        tips.add("💧 운동 전후 충분한 수분 섭취를 하세요");
        
        return tips;
    }

    public Map<String, Object> getWorkoutTemplates() {
        Map<String, Object> templates = new HashMap<>();
        
        List<String> goals = Arrays.asList("diet", "strength", "body", "fitness", "stamina");
        List<String> experiences = Arrays.asList("beginner", "intermediate", "advanced");
        
        templates.put("goals", goals);
        templates.put("experiences", experiences);
        templates.put("totalTemplates", goals.size() * experiences.size());
        
        return templates;
    }
}