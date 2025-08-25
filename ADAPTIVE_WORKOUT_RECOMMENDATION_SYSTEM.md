# 적응형 운동 추천 시스템 구현 워크플로우

## 🎯 목표
**현재**: 고정 템플릿 선택기 → **목표**: 학습하는 개인 맞춤형 추천 시스템

## 📊 현재 문제점 분석
- ❌ **고정된 switch-case 로직** (추천이 아닌 분류)
- ❌ **피드백 수집 없음** (학습 불가)
- ❌ **점진적 발전 없음** (항상 같은 강도)
- ❌ **개인 특성 미반영** (BMI만 고려)

---

## Phase 1: 데이터 수집 인프라 구축 - 예상 소요: 4-5시간

### Task 1.1: 피드백 수집 테이블 설계
```sql
-- 운동 세션 기록
CREATE TABLE workout_sessions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    goal VARCHAR(50) NOT NULL,
    planned_duration INT, -- 계획된 시간(분)
    actual_duration INT, -- 실제 소요 시간(분)
    session_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 개별 운동 실행 기록
CREATE TABLE exercise_executions (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    exercise_name VARCHAR(100) NOT NULL,
    planned_sets INT,
    completed_sets INT,
    planned_reps INT,
    completed_reps INT,
    planned_duration INT, -- 초
    actual_duration INT, -- 초
    perceived_exertion INT, -- 1~10 RPE 스케일
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
);

-- 세션 전체 피드백
CREATE TABLE session_feedback (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    session_id BIGINT NOT NULL,
    completion_rate DECIMAL(3,2), -- 0.0 ~ 1.0
    overall_difficulty INT, -- 1(너무쉬움) ~ 5(너무어려움) 
    satisfaction INT, -- 1(별로) ~ 5(매우만족)
    energy_after INT, -- 1(완전지침) ~ 5(에너지충만)
    muscle_soreness INT, -- 1(전혀없음) ~ 5(심한통증)
    would_repeat BOOLEAN, -- 다시 하고 싶은지
    comments TEXT, -- 자유 의견
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES workout_sessions(id)
);

-- 사용자 운동 선호도 (학습을 통해 축적)
CREATE TABLE user_exercise_preferences (
    user_id BIGINT,
    exercise_name VARCHAR(100),
    preference_score DECIMAL(3,2), -- -1.0(싫어함) ~ 1.0(좋아함)
    effectiveness_score DECIMAL(3,2), -- 0.0 ~ 1.0 (효과 체감도)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, exercise_name)
);
```

### Task 1.2: 피드백 수집 API 구현
```java
@PostMapping("/sessions/{sessionId}/feedback")
public ResponseEntity<?> submitFeedback(
    @PathVariable Long sessionId,
    @Valid @RequestBody SessionFeedbackRequest feedback) {
    
    // 1. 피드백 저장
    sessionFeedbackService.saveFeedback(sessionId, feedback);
    
    // 2. 사용자 프로필 업데이트
    userProfileService.updateFitnessProfile(sessionId, feedback);
    
    // 3. 운동 선호도 학습
    preferenceService.updateExercisePreferences(sessionId, feedback);
    
    return ResponseEntity.ok("피드백이 저장되었습니다");
}
```

---

## Phase 2: 적응형 추천 알고리즘 구현 - 예상 소요: 6-8시간

### Task 2.1: 사용자 피트니스 프로필 서비스
```java
@Service
public class UserFitnessProfileService {
    
    public UserFitnessProfile calculateProfile(Long userId) {
        // 최근 4주 데이터 분석
        List<SessionFeedback> recentFeedback = getRecentFeedback(userId, 28);
        
        return UserFitnessProfile.builder()
            .currentFitnessLevel(calculateFitnessLevel(recentFeedback))
            .averageCompletionRate(calculateCompletionRate(recentFeedback))
            .preferredDifficulty(calculatePreferredDifficulty(recentFeedback))
            .progressTrend(calculateProgressTrend(recentFeedback))
            .recoveryPattern(calculateRecoveryPattern(recentFeedback))
            .motivationLevel(calculateMotivationLevel(recentFeedback))
            .build();
    }
    
    private double calculateProgressTrend(List<SessionFeedback> feedback) {
        // 시간에 따른 완료율, 만족도, 체감 난이도 변화 추이 분석
        // 선형 회귀를 통해 발전 속도 계산
    }
}
```

### Task 2.2: 점진적 부하 증가 로직
```java
@Service 
public class AdaptiveIntensityService {
    
    public WorkoutPlan adaptIntensity(WorkoutPlan basePlan, UserFitnessProfile profile) {
        
        double adaptationFactor = calculateAdaptationFactor(profile);
        
        return basePlan.getExercises().stream()
            .map(exercise -> adaptExercise(exercise, adaptationFactor, profile))
            .collect(toList());
    }
    
    private Exercise adaptExercise(Exercise exercise, double factor, UserFitnessProfile profile) {
        
        // 개인별 운동 선호도 반영
        double preferenceScore = getExercisePreference(profile.getUserId(), exercise.getName());
        
        // 최근 수행 능력 반영
        ExerciseProgress recentProgress = getRecentProgress(profile.getUserId(), exercise.getName());
        
        return Exercise.builder()
            .name(exercise.getName())
            .sets(adaptSets(exercise.getSets(), factor, recentProgress))
            .reps(adaptReps(exercise.getReps(), factor, recentProgress))
            .restSeconds(adaptRest(exercise.getRestSeconds(), profile.getRecoveryPattern()))
            .intensity(adaptIntensity(exercise.getIntensity(), factor))
            .build();
    }
    
    private int adaptSets(int baseSets, double factor, ExerciseProgress progress) {
        // 최근 완료율이 높고 쉽게 느꼈다면 세트 증가
        if (progress.getAverageCompletionRate() > 0.9 && progress.getAverageDifficulty() < 2.5) {
            return Math.min(baseSets + 1, 6); // 최대 6세트
        }
        // 완료율이 낮거나 너무 어려웠다면 세트 감소
        if (progress.getAverageCompletionRate() < 0.7 || progress.getAverageDifficulty() > 4.0) {
            return Math.max(baseSets - 1, 2); // 최소 2세트
        }
        return baseSets;
    }
}
```

### Task 2.3: 개인화 운동 선택 알고리즘
```java
@Service
public class PersonalizedExerciseSelector {
    
    public List<Exercise> selectExercises(
        String goal, 
        UserFitnessProfile profile,
        int targetDuration) {
        
        // 1. 목표별 운동 풀 구성
        List<Exercise> candidatePool = buildExercisePool(goal, profile);
        
        // 2. 제약 조건 필터링
        candidatePool = applyConstraints(candidatePool, profile);
        
        // 3. 점수 기반 운동 선택
        List<Exercise> selectedExercises = selectByScore(candidatePool, profile, targetDuration);
        
        // 4. 균형 및 다양성 보장
        return ensureBalance(selectedExercises, goal);
    }
    
    private List<Exercise> selectByScore(List<Exercise> candidates, UserFitnessProfile profile, int targetDuration) {
        
        return candidates.stream()
            .map(exercise -> calculateExerciseScore(exercise, profile))
            .sorted((a, b) -> Double.compare(b.getScore(), a.getScore()))
            .filter(scoredExercise -> !isRecentlyDone(scoredExercise.getExercise(), profile.getUserId()))
            .map(ScoredExercise::getExercise)
            .limit(calculateOptimalExerciseCount(targetDuration))
            .collect(toList());
    }
    
    private double calculateExerciseScore(Exercise exercise, UserFitnessProfile profile) {
        double score = 0.0;
        
        // 1. 기본 적합도 (목표와의 일치도)
        score += calculateGoalFit(exercise, profile.getGoal()) * 0.3;
        
        // 2. 개인 선호도 
        score += getExercisePreference(profile.getUserId(), exercise.getName()) * 0.2;
        
        // 3. 현재 피트니스 레벨과의 적합도
        score += calculateDifficultyFit(exercise, profile.getCurrentFitnessLevel()) * 0.2;
        
        // 4. 최근 진행도 (너무 쉽거나 어려운 운동 배제)
        score += calculateProgressFit(exercise, profile) * 0.15;
        
        // 5. 다양성 보너스 (최근에 안한 운동 우대)
        score += calculateVarietyBonus(exercise, profile.getUserId()) * 0.15;
        
        return score;
    }
}
```

---

## Phase 3: 학습 및 최적화 - 예상 소요: 4-5시간

### Task 3.1: 추천 성과 분석 시스템
```java
@Service
public class RecommendationAnalysisService {
    
    @Scheduled(cron = "0 0 2 * * ?") // 매일 새벽 2시
    public void analyzeRecommendationPerformance() {
        
        List<User> activeUsers = userService.getActiveUsers(7); // 최근 7일 활동 사용자
        
        activeUsers.forEach(user -> {
            RecommendationPerformance performance = calculatePerformance(user.getId());
            optimizeUserParameters(user.getId(), performance);
        });
    }
    
    private RecommendationPerformance calculatePerformance(Long userId) {
        // 최근 추천의 성과 분석
        // - 완료율
        // - 만족도 
        // - 재선택률
        // - 진행도 개선률
        return RecommendationPerformance.builder()
            .completionRate(calculateCompletionRate(userId))
            .satisfactionScore(calculateSatisfactionScore(userId))
            .progressImprovement(calculateProgressImprovement(userId))
            .build();
    }
}
```

### Task 3.2: A/B 테스트 프레임워크
```java
@Service
public class RecommendationExperimentService {
    
    public WorkoutPlan generateRecommendation(Long userId, String goal) {
        
        // 사용자를 실험 그룹에 할당
        ExperimentGroup group = assignExperimentGroup(userId);
        
        switch (group) {
            case CONSERVATIVE:
                return generateConservativeRecommendation(userId, goal);
            case AGGRESSIVE: 
                return generateAggressiveRecommendation(userId, goal);
            case BALANCED:
                return generateBalancedRecommendation(userId, goal);
            default:
                return generateDefaultRecommendation(userId, goal);
        }
    }
    
    // 실험 결과 수집 및 분석
    @EventListener
    public void onSessionComplete(SessionCompleteEvent event) {
        ExperimentResult result = ExperimentResult.builder()
            .userId(event.getUserId())
            .experimentGroup(getUserExperimentGroup(event.getUserId()))
            .completionRate(event.getCompletionRate())
            .satisfaction(event.getSatisfaction())
            .build();
            
        experimentResultRepository.save(result);
    }
}
```

---

## Phase 4: 프론트엔드 피드백 UI - 예상 소요: 3-4시간

### Task 4.1: 운동 후 피드백 컴포넌트
```typescript
// WorkoutFeedback.tsx
const WorkoutFeedback: React.FC<{sessionId: number}> = ({ sessionId }) => {
  const [feedback, setFeedback] = useState({
    overallDifficulty: 3,
    satisfaction: 3,
    energyAfter: 3,
    muscleSoreness: 2,
    wouldRepeat: true,
    exerciseFeedback: [] as ExerciseFeedback[]
  });

  const handleSubmit = async () => {
    await api.post(`/sessions/${sessionId}/feedback`, feedback);
    // 다음 추천 미리보기 표시
    showNextRecommendationPreview();
  };

  return (
    <div className="feedback-form">
      <h3>오늘 운동 어떠셨나요?</h3>
      
      <div className="difficulty-rating">
        <label>전체적인 난이도</label>
        <StarRating 
          value={feedback.overallDifficulty} 
          labels={['너무 쉬웠다', '쉬웠다', '적당했다', '어려웠다', '너무 어려웠다']}
          onChange={(value) => setFeedback({...feedback, overallDifficulty: value})}
        />
      </div>
      
      <div className="exercise-specific-feedback">
        <h4>각 운동별 피드백</h4>
        {exerciseList.map(exercise => (
          <ExerciseRating key={exercise.id} exercise={exercise} />
        ))}
      </div>
      
      <button onClick={handleSubmit}>다음 운동 추천받기</button>
    </div>
  );
};
```

---

## 🎯 구현 우선순위 

### ⭐ 최우선 (MVP)
1. **Phase 1**: 피드백 데이터 수집 인프라
2. **Phase 2.1**: 기본 적응형 로직 (난이도 조절)
3. **Phase 4.1**: 간단한 피드백 UI

### ⭐⭐ 2순위 
1. **Phase 2.2**: 개인화 운동 선택
2. **Phase 2.3**: 점진적 부하 증가

### ⭐⭐⭐ 3순위
1. **Phase 3**: 학습 최적화 및 A/B 테스트

---

## 🚀 예상 효과

### MVP 완료 후 (Phase 1 + 2.1 + 4.1)
- ✅ **진짜 개인 맞춤형 추천** 시작
- ✅ **점진적 발전** 가능
- ✅ **사용자 피드백 기반 학습**

### 전체 완료 후
- 🎯 **Netflix 수준의 개인화** 추천
- 📈 **데이터 기반 최적화**
- 🔄 **지속적 학습 및 개선**

---

## 💡 핵심 개념

### 1. **적응형 난이도 조절**
```
쉬웠다 (완료율 95%+) → 강도 10% 증가
어려웠다 (완료율 70%-) → 강도 15% 감소  
적당했다 → 미세 조정
```

### 2. **개인 선호도 학습**
```
만족도 + 재선택 여부 + 완료율 → 선호도 점수 업데이트
선호하는 운동 → 더 자주 추천
싫어하는 운동 → 대체 운동 제안
```

### 3. **점진적 발전 추적**
```
주차별 진행도 분석 → 목표 달성률 → 다음 단계 자동 조정
정체기 감지 → 운동 변화 또는 강도 조절
```

---

*이제 진짜 개인 트레이너가 옆에서 운동을 봐주는 것 같은 시스템이 만들어집니다!*