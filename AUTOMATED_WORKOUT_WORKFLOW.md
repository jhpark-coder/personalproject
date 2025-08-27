# 🏋️‍♂️ FitMate 자동화 운동 플로우 구현 워크플로우

## 📋 프로젝트 개요

**목표**: 온보딩 데이터 기반 완전 자동화된 운동 세션 플로우 구현
**기간**: 2-3일
**우선순위**: Critical

### 🎯 요구사항
```
0. 운동세트 선택 (온보딩 스타일 또는 모달)
   - 추천운동세트 / 상체단련세트 / 체력증진(유산소)세트 / 하체단련세트
1. 시작합니다! (1번운동) (x회, y세트 반복)
2. 다음운동! (2번운동) (a회, b세트 반복)
...
N. 마무리 
N+1. 운동결과분석 및 알림
```

---

## 🏗️ 시스템 아키텍처 분석

### ✅ 현재 구현 완료된 시스템
- **온보딩 데이터 수집**: 운동경험/목표/신체정보
- **AI 운동 추천**: 하이브리드 개인화 추천 시스템
- **실시간 모션 코칭**: MediaPipe 기반 7가지 운동 지원
- **운동 결과 추적**: 세션/실행 데이터 저장
- **실시간 알림**: WebSocket + MongoDB + SMS

### ❌ 구현 필요한 Gap
1. **자동화된 운동 플로우 컨트롤러**
2. **운동 프로그램 셀렉터 UI**
3. **멀티 운동 순차 진행 시스템**
4. **운동 완료 후 자동 분석 및 알림**

---

## 📚 구현 워크플로우

### **Phase 1: 운동 프로그램 셀렉터 (Day 1 Morning)**

#### 🎯 Task 1.1: WorkoutProgramSelector 컴포넌트 생성
**파일**: `frontend/src/features/workout/components/WorkoutProgramSelector.tsx`

```typescript
interface WorkoutProgram {
  id: 'recommended' | 'upper_body' | 'cardio' | 'lower_body';
  title: string;
  description: string;
  icon: string;
  color: string;
  exercises: {
    exerciseType: ExerciseType;
    targetSets: number;
    targetReps: number;
    restSeconds: number;
  }[];
}

const WORKOUT_PROGRAMS: WorkoutProgram[] = [
  {
    id: 'recommended',
    title: '추천 운동세트',
    description: '개인 맞춤 추천 운동',
    icon: '🎯',
    color: '#007AFF',
    exercises: [] // 추천 API에서 동적으로 가져옴
  },
  {
    id: 'upper_body', 
    title: '상체 단련세트',
    description: '상체 근력 강화 중심',
    icon: '💪',
    color: '#FF3B30',
    exercises: [
      { exerciseType: 'pushup', targetSets: 3, targetReps: 15, restSeconds: 90 },
      { exerciseType: 'plank', targetSets: 3, targetReps: 45, restSeconds: 60 },
      // ... 추가 상체 운동
    ]
  },
  // ... 다른 프로그램들
];
```

**UI 스타일**: OnboardingExperience.tsx와 동일한 카드 선택 스타일
- 온보딩과 일관된 사용자 경험
- 각 프로그램별 아이콘과 설명
- 선택 시 체크마크 표시

#### 🎯 Task 1.2: 모달 버전 구현 (선택사항)
**파일**: `frontend/src/features/workout/components/WorkoutProgramModal.tsx`

```typescript
interface WorkoutProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProgram: (program: WorkoutProgram) => void;
}
```

### **Phase 2: 통합 워크플로우 컨트롤러 (Day 1 Afternoon)**

#### 🎯 Task 2.1: IntegratedWorkoutSession 컴포넌트 생성
**파일**: `frontend/src/features/workout/components/IntegratedWorkoutSession.tsx`

```typescript
interface WorkoutSessionState {
  selectedProgram: WorkoutProgram | null;
  currentPhase: 'selection' | 'warmup' | 'main' | 'cooldown' | 'complete';
  currentExerciseIndex: number;
  currentSet: number;
  totalSets: number;
  sessionStartTime: Date | null;
  exerciseResults: ExerciseSessionResult[];
}

class WorkoutSessionController {
  // 자동 플로우 관리
  startSession(program: WorkoutProgram): void;
  nextExercise(): void;
  nextSet(): void;
  completeSession(): Promise<void>;
  
  // 상태 관리
  updateExerciseResult(result: ExerciseAnalysis): void;
  calculateSessionSummary(): SessionSummary;
}
```

#### 🎯 Task 2.2: 자동 전환 로직 구현

```typescript
const handleExerciseComplete = useCallback(async () => {
  // 현재 세트 완료 체크
  if (currentSet < targetSets) {
    // 다음 세트로 이동
    startRestTimer(restSeconds);
    setCurrentSet(prev => prev + 1);
  } else if (currentExerciseIndex < totalExercises - 1) {
    // 다음 운동으로 이동
    playTTSFeedback("다음 운동으로 이동합니다!", true);
    setCurrentExerciseIndex(prev => prev + 1);
    setCurrentSet(1);
  } else {
    // 전체 세션 완료
    await completeWorkoutSession();
  }
}, [currentSet, targetSets, currentExerciseIndex, totalExercises]);
```

### **Phase 3: MotionCoach 멀티 운동 지원 (Day 2 Morning)**

#### 🎯 Task 3.1: MotionCoach 확장
**파일 수정**: `frontend/src/features/workout/components/MotionCoach.tsx`

```typescript
interface MotionCoachProps {
  // 기존 단일 운동 지원
  exerciseType?: ExerciseType;
  
  // 새로운 멀티 운동 지원
  workoutProgram?: WorkoutProgram;
  currentExerciseIndex?: number;
  onExerciseComplete?: (result: ExerciseResult) => void;
  onSetComplete?: (setResult: SetResult) => void;
}

// 멀티 운동 상태 관리
const [programExercises, setProgramExercises] = useState<Exercise[]>([]);
const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
const [currentSet, setCurrentSet] = useState(1);

// 자동 운동 전환 로직
const handleSetComplete = useCallback(() => {
  const currentExercise = programExercises[currentExerciseIndex];
  
  if (currentSet < currentExercise.targetSets) {
    // 세트 간 휴식
    startRestTimer(currentExercise.restSeconds);
    setCurrentSet(prev => prev + 1);
  } else {
    // 운동 완료, 다음 운동으로 전환
    onExerciseComplete?.(exerciseResult);
    if (currentExerciseIndex < programExercises.length - 1) {
      setCurrentExerciseIndex(prev => prev + 1);
      setCurrentSet(1);
    }
  }
}, [currentSet, currentExerciseIndex, programExercises]);
```

#### 🎯 Task 3.2: 휴식 타이머 UI 구현
**파일**: `frontend/src/features/workout/components/RestTimer.tsx`

```typescript
interface RestTimerProps {
  duration: number; // 휴식 시간 (초)
  onComplete: () => void;
  onSkip?: () => void;
}

const RestTimer: React.FC<RestTimerProps> = ({ duration, onComplete, onSkip }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  
  // 원형 진행 바와 스킵 버튼
  return (
    <div className="rest-timer-overlay">
      <div className="rest-timer-content">
        <h2>휴식 시간</h2>
        <div className="circular-progress">
          <span className="time-display">{timeLeft}초</span>
        </div>
        <div className="rest-actions">
          <button onClick={onSkip}>휴식 건너뛰기</button>
          <p>다음: {nextExercise?.name}</p>
        </div>
      </div>
    </div>
  );
};
```

### **Phase 4: 운동 결과 분석 및 알림 연동 (Day 2 Afternoon)**

#### 🎯 Task 4.1: 세션 완료 처리 API 확장
**파일 수정**: `src/main/java/backend/fitmate/controller/WorkoutController.java`

```java
@PostMapping("/complete-integrated-session")
public ResponseEntity<?> completeIntegratedWorkoutSession(
    @RequestBody IntegratedSessionRequest request
) {
    try {
        // 1. 전체 세션 데이터 저장
        WorkoutSession session = saveIntegratedSession(request);
        
        // 2. 세션 분석 수행
        SessionAnalysis analysis = analyzeWorkoutSession(session);
        
        // 3. 자동 알림 발송
        sendCompletionNotification(session, analysis);
        
        // 4. 다음 추천 업데이트 (적응형 학습)
        updateUserFitnessProfile(session);
        
        return ResponseEntity.ok(Map.of(
            "success", true,
            "sessionId", session.getId(),
            "analysis", analysis,
            "nextRecommendation", generateNextRecommendation(session)
        ));
        
    } catch (Exception e) {
        return ResponseEntity.status(500).body(Map.of(
            "success", false,
            "message", "세션 완료 처리 중 오류: " + e.getMessage()
        ));
    }
}

private void sendCompletionNotification(WorkoutSession session, SessionAnalysis analysis) {
    // Communication Server로 알림 전송
    NotificationRequest notification = NotificationRequest.builder()
        .targetUserId(session.getUser().getId())
        .type(NotificationType.WORKOUT_COMPLETION)
        .title("운동 완료! 🎉")
        .message(String.format(
            "%s 운동을 완료했습니다! 총 %d회, %d분 소요",
            session.getGoal(),
            analysis.getTotalReps(),
            session.getActualDuration()
        ))
        .build();
        
    communicationService.sendNotification(notification);
}
```

#### 🎯 Task 4.2: 세션 결과 분석 컴포넌트
**파일**: `frontend/src/features/workout/components/WorkoutSessionSummary.tsx`

```typescript
interface SessionSummary {
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  caloriesBurned: number;
  averageFormScore: number;
  improvements: string[];
  nextRecommendations: string[];
}

const WorkoutSessionSummary: React.FC<{ summary: SessionSummary }> = ({ summary }) => {
  return (
    <div className="session-summary">
      <div className="success-header">
        <h1>🎉 운동 완료!</h1>
        <p>훌륭한 운동이었습니다!</p>
      </div>
      
      <div className="summary-stats">
        <div className="stat-card">
          <span className="stat-icon">⏱️</span>
          <span className="stat-value">{Math.floor(summary.totalDuration / 60)}분</span>
          <span className="stat-label">총 시간</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon">🔥</span>
          <span className="stat-value">{summary.caloriesBurned}</span>
          <span className="stat-label">칼로리</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon">💪</span>
          <span className="stat-value">{summary.totalReps}</span>
          <span className="stat-label">총 횟수</span>
        </div>
        
        <div className="stat-card">
          <span className="stat-icon">📊</span>
          <span className="stat-value">{Math.round(summary.averageFormScore * 100)}%</span>
          <span className="stat-label">자세 정확도</span>
        </div>
      </div>
      
      {summary.improvements.length > 0 && (
        <div className="improvements-section">
          <h3>💡 개선 포인트</h3>
          <ul>
            {summary.improvements.map((improvement, index) => (
              <li key={index}>{improvement}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="next-actions">
        <button className="primary-button" onClick={shareResults}>
          결과 공유하기
        </button>
        <button className="secondary-button" onClick={viewDetailedAnalysis}>
          상세 분석 보기
        </button>
      </div>
    </div>
  );
};
```

### **Phase 5: UI/UX 통합 및 네비게이션 (Day 3)**

#### 🎯 Task 5.1: 메인 워크플로우 라우팅 통합
**파일 수정**: `frontend/src/App.tsx`

```typescript
// 새로운 통합 워크플로우 라우트 추가
<Route path="/workout/integrated" element={<IntegratedWorkoutSession />} />
<Route path="/workout/program-select" element={<WorkoutProgramSelector />} />
<Route path="/workout/session-summary/:sessionId" element={<WorkoutSessionSummary />} />
```

#### 🎯 Task 5.2: 대시보드에서 통합 플로우 진입점 추가
**파일 수정**: `frontend/src/components/Dashboard.tsx`

```typescript
// 기존 "운동 추천" 버튼 옆에 추가
<div className="workout-actions">
  <Link to="/workout/recommendation" className="workout-card">
    <span className="workout-icon">🎯</span>
    <h3>운동 추천받기</h3>
    <p>개인 맞춤 운동 추천</p>
  </Link>
  
  {/* 새로운 통합 워크플로우 진입점 */}
  <Link to="/workout/integrated" className="workout-card featured">
    <span className="workout-icon">🏋️‍♂️</span>
    <h3>운동 시작하기</h3>
    <p>완전 자동화 운동 세션</p>
  </Link>
</div>
```

---

## 🔧 기술적 구현 세부사항

### **데이터 플로우**
```
1. 사용자 온보딩 데이터 → 운동 프로그램 추천 생성
2. 프로그램 선택 → 세션 시작 → 자동 운동 진행
3. 실시간 모션 분석 → 자세 피드백 → 횟수 카운팅
4. 운동 완료 → 자동 전환 → 전체 세션 완료
5. 결과 분석 → 자동 알림 발송 → 다음 추천 업데이트
```

### **상태 관리 구조**
```typescript
interface GlobalWorkoutState {
  // 세션 상태
  currentSession: WorkoutSession | null;
  
  // 프로그램 상태  
  selectedProgram: WorkoutProgram | null;
  currentPhase: 'selection' | 'active' | 'rest' | 'complete';
  
  // 진행 상태
  currentExerciseIndex: number;
  currentSet: number;
  sessionResults: ExerciseResult[];
}
```

### **API 엔드포인트 확장**
```
POST /api/workout/start-integrated-session
POST /api/workout/complete-integrated-session  
GET  /api/workout/program-templates
POST /api/workout/update-session-progress
```

---

## 📋 개발 체크리스트

### **Day 1 체크포인트**
- [ ] WorkoutProgramSelector 컴포넌트 완성
- [ ] IntegratedWorkoutSession 기본 구조 완성
- [ ] 프로그램 선택 → 세션 시작 플로우 동작 확인
- [ ] 기본 UI 스타일링 완료

### **Day 2 체크포인트**  
- [ ] MotionCoach 멀티 운동 지원 완성
- [ ] 자동 운동 전환 로직 동작 확인
- [ ] RestTimer 컴포넌트 완성
- [ ] 백엔드 세션 완료 API 확장 완료

### **Day 3 체크포인트**
- [ ] 전체 플로우 end-to-end 테스트 통과
- [ ] UI/UX 최종 검토 및 수정
- [ ] 알림 시스템 연동 확인
- [ ] 성능 최적화 및 버그 수정

---

## 🎯 성공 기준

### **기능적 요구사항**
✅ 사용자가 운동 세트를 선택할 수 있다
✅ 선택한 운동이 자동으로 순차 진행된다  
✅ 각 운동에서 실시간 모션 코칭이 동작한다
✅ 운동 완료 후 자동으로 다음 운동으로 전환된다
✅ 전체 세션 완료 후 결과 분석이 표시된다
✅ 운동 완료 시 자동으로 알림이 발송된다

### **사용자 경험 요구사항**  
✅ 온보딩과 일관된 UI/UX
✅ 끊김 없는 자동화된 플로우
✅ 직관적인 진행 상황 표시
✅ 명확한 피드백과 안내

### **기술적 요구사항**
✅ 기존 시스템과의 완전한 호환성
✅ 실시간 데이터 동기화
✅ 안정적인 세션 상태 관리
✅ 확장 가능한 아키텍처

---

## 🚀 배포 및 테스트 전략

### **개발 환경 테스트**
1. **단위 테스트**: 각 컴포넌트별 기능 테스트
2. **통합 테스트**: 전체 플로우 end-to-end 테스트  
3. **사용자 테스트**: 실제 운동 시나리오 테스트

### **성능 고려사항**
- MediaPipe 모델 로딩 최적화
- 실시간 포즈 분석 성능 모니터링
- 메모리 사용량 최적화 (긴 세션 대응)

### **에러 처리 및 복구**
- 카메라 연결 실패 시 복구 로직
- 운동 중 세션 중단 시 재시작 기능
- 네트워크 오류 시 로컬 데이터 보존

---

## 📈 확장 계획

### **단기 확장 (1-2주)**
- 운동 진행 타이머 기능 추가
- 소셜 기능 (친구와 운동 공유)
- 상세 운동 통계 대시보드

### **중기 확장 (1-2개월)**  
- 머신러닝 기반 개인화 강화
- 웨어러블 기기 연동
- 영양 관리 통합

이 워크플로우를 따라 구현하면 사용자가 원하는 **완전 자동화된 운동 시스템**을 성공적으로 구현할 수 있습니다! 🎉