# FitMate 프로젝트 - AI 운동 추천 및 모션 코칭 시스템 분석

## 개요
FitMate의 핵심 기능인 AI 기반 운동 추천 시스템과 MediaPipe를 활용한 실시간 모션 코칭 시스템에 대한 상세 분석입니다. 개인 맞춤형 운동 프로그램 생성부터 실시간 자세 교정까지 포괄적인 피트니스 AI 솔루션을 제공합니다.

## 시스템 아키텍처

### AI 운동 추천 시스템
```
사용자 데이터 → AI 분석 엔진 → 개인 맞춤 운동 → 실시간 피드백
    ↓              ↓              ↓              ↓
온보딩 정보     운동 히스토리      운동 프로그램    성과 분석
신체 정보      MET 데이터        난이도 조절     목표 달성도
```

### 모션 코칭 시스템
```
웹캠 입력 → MediaPipe Pose → 관절점 추출 → 운동 분석 → 실시간 피드백
    ↓           ↓              ↓           ↓           ↓
실시간 영상   포즈 인식       좌표 계산     동작 카운트   자세 교정
```

## 파일 구조

### AI 운동 추천 시스템
```
src/main/java/backend/fitmate/
├── Exercise/
│   ├── entity/
│   │   ├── Exercise.java              # 운동 정보 엔티티
│   │   ├── WorkoutRecord.java         # 운동 기록 엔티티
│   │   └── METData.java              # MET 값 데이터
│   ├── service/
│   │   ├── ExerciseService.java       # 운동 데이터 관리
│   │   ├── WorkoutService.java        # 운동 기록 관리
│   │   ├── AIRecommendationService.java # AI 추천 엔진
│   │   └── METCalculationService.java # 칼로리 계산
│   ├── controller/
│   │   ├── ExerciseController.java    # 운동 API
│   │   └── WorkoutController.java     # 운동 기록 API
│   └── repository/
│       ├── ExerciseRepository.java
│       └── WorkoutRecordRepository.java
```

### 모션 코칭 시스템 (Frontend)
```
frontend/src/components/
├── MotionCoach.tsx                    # 통합 모션 코칭 컴포넌트
├── MotionCoach.css                    # 코칭 UI 스타일
├── pose-detection/
│   ├── PoseDetector.tsx              # 포즈 인식 엔진
│   ├── PoseDetector.css              # 포즈 인식 UI
│   ├── WorkoutAnalyzer.tsx           # 운동 분석 로직
│   └── ExerciseCounter.tsx           # 운동 카운터
├── workout/
│   ├── ExerciseSearch.tsx            # 운동 검색 및 필터
│   ├── ExerciseDetail.tsx            # 운동 상세 정보
│   └── WorkoutRecommendation.tsx     # AI 추천 결과
└── analytics/
    ├── WorkoutStats.tsx              # 운동 통계
    └── PerformanceChart.tsx          # 성과 차트
```

## AI 운동 추천 시스템 상세 분석

### 1. 개인화 데이터 수집
```java
// AIRecommendationService.java
@Service
public class AIRecommendationService {
    
    public PersonalizationData collectUserData(Long userId) {
        User user = userService.findById(userId);
        List<WorkoutRecord> history = workoutService.getRecentHistory(userId, 30); // 최근 30일
        
        return PersonalizationData.builder()
            .age(user.getAge())
            .gender(user.getGender())
            .height(user.getHeight())
            .weight(user.getWeight())
            .fitnessLevel(user.getFitnessLevel())          // 온보딩에서 수집
            .goals(user.getGoals())                        // 운동 목표
            .workoutHistory(history)                       // 운동 히스토리
            .preferredExercises(getPreferredExercises(userId))
            .availableTime(user.getAvailableWorkoutTime()) // 운동 가능 시간
            .equipment(user.getAvailableEquipment())       // 보유 장비
            .build();
    }
}
```

### 2. MET 기반 칼로리 계산
```java
// METCalculationService.java
@Service
public class METCalculationService {
    
    public double calculateCalories(Exercise exercise, double weightKg, int durationMinutes) {
        // 칼로리 = MET × 체중(kg) × 시간(시간)
        double metValue = exercise.getMetValue();
        double hours = durationMinutes / 60.0;
        
        return metValue * weightKg * hours;
    }
    
    public WorkoutIntensity calculateIntensity(double metValue) {
        if (metValue < 3.0) return WorkoutIntensity.LOW;
        else if (metValue < 6.0) return WorkoutIntensity.MODERATE;
        else return WorkoutIntensity.HIGH;
    }
    
    public List<Exercise> filterByIntensity(List<Exercise> exercises, 
                                          FitnessLevel userLevel, 
                                          WorkoutGoal goal) {
        return exercises.stream()
            .filter(exercise -> isAppropriateIntensity(exercise, userLevel, goal))
            .collect(Collectors.toList());
    }
}
```

### 3. AI 추천 알고리즘
```java
// AIRecommendationService.java
public class AIRecommendationService {
    
    public WorkoutPlan generateRecommendation(PersonalizationData userData) {
        // 1. 목표별 운동 카테고리 선택
        List<ExerciseCategory> categories = selectCategoriesByGoal(userData.getGoals());
        
        // 2. 피트니스 레벨에 따른 강도 조절
        WorkoutIntensity targetIntensity = calculateTargetIntensity(userData.getFitnessLevel());
        
        // 3. 근육 그룹 균형 고려
        List<MuscleGroup> targetMuscles = balanceMuscleGroups(userData.getWorkoutHistory());
        
        // 4. 개인 선호도 반영
        List<Exercise> candidateExercises = filterExercises(categories, targetIntensity, targetMuscles);
        candidateExercises = applyUserPreferences(candidateExercises, userData);
        
        // 5. 시간 제약 고려 운동 조합
        return optimizeWorkoutPlan(candidateExercises, userData.getAvailableTime());
    }
    
    private List<MuscleGroup> balanceMuscleGroups(List<WorkoutRecord> history) {
        // 최근 운동 히스토리에서 부족한 근육 그룹 식별
        Map<MuscleGroup, Integer> muscleGroupCount = history.stream()
            .collect(groupingBy(
                record -> record.getExercise().getPrimaryMuscleGroup(),
                summingInt(record -> 1)
            ));
        
        return Arrays.stream(MuscleGroup.values())
            .sorted((a, b) -> muscleGroupCount.getOrDefault(a, 0).compareTo(
                              muscleGroupCount.getOrDefault(b, 0)))
            .limit(3) // 상위 3개 부족한 근육 그룹
            .collect(Collectors.toList());
    }
}
```

### 4. 운동 데이터 구조
```java
// Exercise.java
@Entity
@Table(name = "exercises")
public class Exercise {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String name;
    private String nameKr;                    // 한국어 이름
    private String description;
    private String instructions;              // 운동 방법
    
    private Double metValue;                  // MET 값 (칼로리 계산)
    private WorkoutIntensity intensity;       // LOW, MODERATE, HIGH
    
    @Enumerated(EnumType.STRING)
    private ExerciseCategory category;        // 운동 카테고리
    
    @ElementCollection(targetClass = MuscleGroup.class)
    @Enumerated(EnumType.STRING)
    private Set<MuscleGroup> primaryMuscles;  // 주요 근육
    
    @ElementCollection(targetClass = MuscleGroup.class)
    @Enumerated(EnumType.STRING)
    private Set<MuscleGroup> secondaryMuscles; // 보조 근육
    
    @ElementCollection(targetClass = Equipment.class)
    @Enumerated(EnumType.STRING)
    private Set<Equipment> requiredEquipment;  // 필요 장비
    
    private String imageUrl;                   // 운동 이미지
    private String videoUrl;                   // 운동 영상
    
    // getter/setter...
}
```

## 모션 코칭 시스템 상세 분석

### 1. MediaPipe 포즈 인식 설정
```typescript
// PoseDetector.tsx
import { Pose, POSE_CONNECTIONS } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export class PoseDetector {
  private pose: Pose;
  private camera: Camera;
  
  constructor(onResults: (results: any) => void) {
    this.pose = new Pose({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });
    
    this.pose.setOptions({
      modelComplexity: 1,          // 0, 1, 2 (높을수록 정확하지만 느림)
      smoothLandmarks: true,       // 랜드마크 스무딩
      enableSegmentation: false,   // 세그멘테이션 비활성화 (성능 향상)
      smoothSegmentation: false,
      minDetectionConfidence: 0.5, // 최소 감지 신뢰도
      minTrackingConfidence: 0.5   // 최소 추적 신뢰도
    });
    
    this.pose.onResults(onResults);
  }
  
  public async startCamera(videoElement: HTMLVideoElement) {
    this.camera = new Camera(videoElement, {
      onFrame: async () => {
        await this.pose.send({ image: videoElement });
      },
      width: 640,
      height: 480
    });
    
    await this.camera.start();
  }
}
```

### 2. 운동별 동작 분석 로직
```typescript
// WorkoutAnalyzer.tsx
export class WorkoutAnalyzer {
  
  // 스쿼트 분석
  analyzeSquat(landmarks: any[]): SquatAnalysis {
    const leftHip = landmarks[23];
    const leftKnee = landmarks[25];
    const leftAnkle = landmarks[27];
    const rightHip = landmarks[24];
    const rightKnee = landmarks[26];
    const rightAnkle = landmarks[28];
    
    // 무릎 각도 계산
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
    
    // 스쿼트 단계 판정
    const isSquatPosition = leftKneeAngle < 90 && rightKneeAngle < 90;
    const isStandingPosition = leftKneeAngle > 160 && rightKneeAngle > 160;
    
    return {
      leftKneeAngle,
      rightKneeAngle,
      isSquatPosition,
      isStandingPosition,
      postureFeedback: this.getSquatPostureFeedback(leftKneeAngle, rightKneeAngle, landmarks)
    };
  }
  
  // 푸시업 분석
  analyzePushup(landmarks: any[]): PushupAnalysis {
    const leftShoulder = landmarks[11];
    const leftElbow = landmarks[13];
    const leftWrist = landmarks[15];
    const rightShoulder = landmarks[12];
    const rightElbow = landmarks[14];
    const rightWrist = landmarks[16];
    
    // 팔꿈치 각도 계산
    const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
    const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
    
    // 몸의 일직선 확인 (어깨-허리-무릎)
    const bodyAlignment = this.checkBodyAlignment(landmarks);
    
    return {
      leftElbowAngle,
      rightElbowAngle,
      bodyAlignment,
      isPushupDown: leftElbowAngle < 90 && rightElbowAngle < 90,
      isPushupUp: leftElbowAngle > 160 && rightElbowAngle > 160
    };
  }
  
  // 각도 계산 함수
  private calculateAngle(pointA: any, pointB: any, pointC: any): number {
    const vectorBA = {
      x: pointA.x - pointB.x,
      y: pointA.y - pointB.y
    };
    
    const vectorBC = {
      x: pointC.x - pointB.x,
      y: pointC.y - pointB.y
    };
    
    const dotProduct = vectorBA.x * vectorBC.x + vectorBA.y * vectorBC.y;
    const magnitudeBA = Math.sqrt(vectorBA.x ** 2 + vectorBA.y ** 2);
    const magnitudeBC = Math.sqrt(vectorBC.x ** 2 + vectorBC.y ** 2);
    
    const cosAngle = dotProduct / (magnitudeBA * magnitudeBC);
    const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
    
    return angle * (180 / Math.PI);
  }
}
```

### 3. 실시간 운동 카운터
```typescript
// ExerciseCounter.tsx
export class ExerciseCounter {
  private exerciseType: ExerciseType;
  private count: number = 0;
  private lastState: ExerciseState = ExerciseState.NONE;
  private stateStartTime: number = 0;
  private minStateDuration: number = 500; // 최소 상태 유지 시간 (ms)
  
  constructor(exerciseType: ExerciseType) {
    this.exerciseType = exerciseType;
  }
  
  update(analysis: any): CounterResult {
    const currentTime = Date.now();
    let currentState = this.determineState(analysis);
    
    // 상태 변화 감지 및 카운트
    if (this.shouldCountRepetition(currentState, currentTime)) {
      this.count++;
      this.lastState = currentState;
      this.stateStartTime = currentTime;
      
      return {
        count: this.count,
        state: currentState,
        feedback: this.generateFeedback(analysis),
        newRepetition: true
      };
    }
    
    return {
      count: this.count,
      state: currentState,
      feedback: this.generateFeedback(analysis),
      newRepetition: false
    };
  }
  
  private shouldCountRepetition(currentState: ExerciseState, currentTime: number): boolean {
    const stateDuration = currentTime - this.stateStartTime;
    
    switch (this.exerciseType) {
      case ExerciseType.SQUAT:
        return this.lastState === ExerciseState.SQUAT_DOWN && 
               currentState === ExerciseState.SQUAT_UP && 
               stateDuration > this.minStateDuration;
               
      case ExerciseType.PUSHUP:
        return this.lastState === ExerciseState.PUSHUP_DOWN && 
               currentState === ExerciseState.PUSHUP_UP && 
               stateDuration > this.minStateDuration;
               
      default:
        return false;
    }
  }
  
  private generateFeedback(analysis: any): string[] {
    const feedback: string[] = [];
    
    switch (this.exerciseType) {
      case ExerciseType.SQUAT:
        if (analysis.leftKneeAngle > analysis.rightKneeAngle + 10) {
          feedback.push("왼쪽 무릎을 더 굽히세요");
        }
        if (analysis.rightKneeAngle > analysis.leftKneeAngle + 10) {
          feedback.push("오른쪽 무릎을 더 굽히세요");
        }
        if (analysis.isSquatPosition && analysis.leftKneeAngle < 70) {
          feedback.push("너무 깊이 앉지 마세요");
        }
        break;
        
      case ExerciseType.PUSHUP:
        if (!analysis.bodyAlignment) {
          feedback.push("몸을 일직선으로 유지하세요");
        }
        if (analysis.leftElbowAngle !== analysis.rightElbowAngle && 
            Math.abs(analysis.leftElbowAngle - analysis.rightElbowAngle) > 15) {
          feedback.push("양팔을 균등하게 사용하세요");
        }
        break;
    }
    
    return feedback;
  }
}
```

### 4. UI 통합 컴포넌트
```typescript
// MotionCoach.tsx
export const MotionCoach: React.FC = () => {
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType>(ExerciseType.SQUAT);
  const [isActive, setIsActive] = useState(false);
  const [count, setCount] = useState(0);
  const [feedback, setFeedback] = useState<string[]>([]);
  const [poseDetector, setPoseDetector] = useState<PoseDetector | null>(null);
  const [analyzer, setAnalyzer] = useState<WorkoutAnalyzer | null>(null);
  const [counter, setCounter] = useState<ExerciseCounter | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const detector = new PoseDetector(onPoseResults);
    const workoutAnalyzer = new WorkoutAnalyzer();
    const exerciseCounter = new ExerciseCounter(selectedExercise);
    
    setPoseDetector(detector);
    setAnalyzer(workoutAnalyzer);
    setCounter(exerciseCounter);
  }, [selectedExercise]);
  
  const onPoseResults = useCallback((results: any) => {
    if (!analyzer || !counter) return;
    
    // 포즈 랜드마크 그리기
    drawPoseLandmarks(canvasRef.current, results);
    
    // 운동 분석
    let analysis;
    switch (selectedExercise) {
      case ExerciseType.SQUAT:
        analysis = analyzer.analyzeSquat(results.poseLandmarks);
        break;
      case ExerciseType.PUSHUP:
        analysis = analyzer.analyzePushup(results.poseLandmarks);
        break;
      // 다른 운동들...
    }
    
    // 카운터 업데이트
    const counterResult = counter.update(analysis);
    setCount(counterResult.count);
    setFeedback(counterResult.feedback);
    
    // 새로운 반복 시 효과음/애니메이션
    if (counterResult.newRepetition) {
      playCountSound();
      showCountAnimation();
    }
  }, [analyzer, counter, selectedExercise]);
  
  const startWorkout = async () => {
    if (poseDetector && videoRef.current) {
      await poseDetector.startCamera(videoRef.current);
      setIsActive(true);
      setCount(0);
    }
  };
  
  const stopWorkout = () => {
    setIsActive(false);
    // 운동 결과 저장
    saveWorkoutResult({
      exerciseType: selectedExercise,
      repetitions: count,
      duration: Date.now() - workoutStartTime,
      date: new Date()
    });
  };
  
  return (
    <div className="motion-coach">
      <div className="video-container">
        <video ref={videoRef} className="video-input" />
        <canvas ref={canvasRef} className="pose-overlay" />
        
        <div className="exercise-info">
          <h2>{getExerciseName(selectedExercise)}</h2>
          <div className="count-display">{count}</div>
        </div>
        
        <div className="feedback-panel">
          {feedback.map((item, index) => (
            <div key={index} className="feedback-item">{item}</div>
          ))}
        </div>
      </div>
      
      <div className="control-panel">
        <select 
          value={selectedExercise} 
          onChange={(e) => setSelectedExercise(e.target.value as ExerciseType)}
          disabled={isActive}
        >
          <option value={ExerciseType.SQUAT}>스쿼트</option>
          <option value={ExerciseType.PUSHUP}>푸시업</option>
          <option value={ExerciseType.LUNGE}>런지</option>
          <option value={ExerciseType.PLANK}>플랭크</option>
        </select>
        
        {!isActive ? (
          <button onClick={startWorkout} className="start-button">
            운동 시작
          </button>
        ) : (
          <button onClick={stopWorkout} className="stop-button">
            운동 종료
          </button>
        )}
      </div>
    </div>
  );
};
```

## 성능 최적화

### 1. 프론트엔드 최적화
```typescript
// 프레임 스킵으로 성능 향상
const FRAME_SKIP = 2; // 2프레임마다 처리
let frameCount = 0;

const onPoseResults = useCallback((results: any) => {
  frameCount++;
  if (frameCount % FRAME_SKIP !== 0) return;
  
  // 포즈 분석 로직...
}, []);

// 웹 워커로 연산 분리
const analysisWorker = new Worker('/workers/pose-analysis.worker.js');
analysisWorker.postMessage({ landmarks: results.poseLandmarks, exerciseType });
```

### 2. 백엔드 최적화
```java
// 운동 데이터 캐싱
@Cacheable(value = "exercises", key = "#category + '_' + #intensity")
public List<Exercise> findExercisesByCategory(ExerciseCategory category, WorkoutIntensity intensity) {
    return exerciseRepository.findByCategoryAndIntensity(category, intensity);
}

// 배치 처리로 성능 향상
@Async
public CompletableFuture<List<Exercise>> generateRecommendationsAsync(PersonalizationData userData) {
    return CompletableFuture.completedFuture(generateRecommendation(userData));
}
```

## 면접 예상 질문 대비

### Q1: MediaPipe를 선택한 이유는?
**A:** 
- **높은 정확도**: Google의 검증된 머신러닝 모델
- **실시간 처리**: 브라우저에서 60fps 실시간 포즈 인식
- **크로스 플랫폼**: 웹/모바일 모두 지원
- **무료**: 상업적 사용 가능한 오픈소스

### Q2: 운동 카운팅 정확도는 어떻게 보장하나요?
**A:**
- **최소 상태 유지 시간**: 너무 빠른 동작 필터링
- **각도 임계값**: 정확한 운동 범위 정의
- **연속성 검증**: 이전 상태와의 논리적 연결성 확인
- **사용자 피드백**: 부정확한 카운트 신고 및 개선

### Q3: AI 추천 알고리즘의 개인화 수준은?
**A:**
- **다차원 데이터**: 신체정보, 목표, 선호도, 히스토리 통합
- **동적 학습**: 운동 기록에 따른 지속적 개선
- **균형 고려**: 근육 그룹 밸런스 자동 조절
- **제약 반영**: 시간, 장비, 부상 이력 고려

### Q4: 대용량 사용자 시 성능 이슈는?
**A:**
- **캐싱 전략**: Redis를 통한 추천 결과 캐싱
- **비동기 처리**: 추천 생성의 백그라운드 처리
- **데이터베이스 최적화**: 인덱싱과 쿼리 최적화
- **CDN 활용**: 정적 리소스 전송 최적화

## 향후 개발 계획

### 1. AI 알고리즘 고도화
- **딥러닝 모델**: TensorFlow.js 기반 맞춤형 모델 개발
- **강화학습**: 사용자 피드백 기반 추천 정확도 향상
- **예측 분석**: 부상 위험도 예측 및 예방

### 2. 모션 코칭 확장
- **더 많은 운동**: 요가, 필라테스, 댄스 등 추가
- **3D 분석**: 깊이 정보를 활용한 정밀 분석
- **AR 통합**: 실제 공간에 가이드 오버레이

### 3. 통합 분석 플랫폼
- **운동 효과 분석**: 장기적 신체 변화 추적
- **개인 트레이너 매칭**: AI 추천과 전문가 코칭 결합
- **커뮤니티 기능**: 사용자간 운동 챌린지 및 경쟁

---

*이 문서는 FitMate 프로젝트의 AI 운동 추천 및 모션 코칭 시스템에 대한 상세 분석을 제공합니다.*