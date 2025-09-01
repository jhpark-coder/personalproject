import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../../context/UserContext';
import { useWorkout } from '../../../context/WorkoutContext';
import { API_ENDPOINTS } from '../../../config/api';
import { apiClient } from '../../../utils/axiosConfig';
import MotionCoach from './MotionCoach';
import RestTimer from './RestTimer';
import type { WorkoutPlan, WorkoutExercise } from '../../../context/WorkoutContext';
import './IntegratedWorkoutSession.css';


interface IntegratedWorkoutSessionProps {
  onSessionComplete?: (sessionData: any) => void;
}

const IntegratedWorkoutSession: React.FC<IntegratedWorkoutSessionProps> = ({ onSessionComplete }) => {
  const { user } = useUser();
  const { workoutPlan, currentExercise, currentExerciseIndex, setWorkoutPlan, goToNextExercise, resetWorkout } = useWorkout();
  const [sessionPhase, setSessionPhase] = useState<'loading' | 'recommendations' | 'exercise-selection' | 'motion-coach' | 'rest' | 'completed'>('loading');
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendedProgram, setRecommendedProgram] = useState<any>(null);
  const [currentSet, setCurrentSet] = useState<number>(1);
  
  // 기본 운동 프로그램 데이터 (API 실패 시 폴백)
  const workoutPrograms = [
    {
      id: "ai_recommended",
      title: "AI 맞춤 추천",
      description: "당신에게 최적화된 운동",
      difficulty: "맞춤형",
      icon: "🤖",
      color: "#FF6B6B",
      exercises: [] // API에서 채워질 예정
    },
    {
      id: "upper_body",
      title: "상체 집중",
      description: "가슴, 어깨, 팔 강화",
      difficulty: "중급",
      icon: "💪",
      color: "#4ECDC4",
      exercises: [
        { exerciseType: 'pushup', targetSets: 3, targetReps: 12, restSeconds: 30 },
        { exerciseType: 'plank', targetSets: 3, targetReps: 30, restSeconds: 30 }
      ]
    },
    {
      id: "lower_body",
      title: "하체 집중",
      description: "허벅지, 엉덩이, 종아리 강화",
      difficulty: "중급",
      icon: "🦵",
      color: "#45B7D1",
      exercises: [
        { exerciseType: 'squat', targetSets: 3, targetReps: 15, restSeconds: 30 },
        { exerciseType: 'lunge', targetSets: 3, targetReps: 12, restSeconds: 30 }
      ]
    },
    {
      id: "cardio",
      title: "유산소 운동",
      description: "심폐지구력 향상",
      difficulty: "고급",
      icon: "🔥",
      color: "#96CEB4",
      exercises: [
        { exerciseType: 'burpee', targetSets: 3, targetReps: 8, restSeconds: 45 },
        { exerciseType: 'mountain_climber', targetSets: 3, targetReps: 20, restSeconds: 30 }
      ]
    }
  ];

  // 데모/시뮬레이션 강제 진입(모션 코치)
  useEffect(() => {
    const rawSearch = window.location.search && window.location.search.length > 1
      ? window.location.search.substring(1)
      : (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(rawSearch);
    const isDemo = params.get('demo') === '1' || params.get('sim') === '1';
    if (isDemo) {
      const exercise = (params.get('exercise') || 'squat').toLowerCase();
      const reps = parseInt(params.get('reps') || '10', 10);
      setSelectedExercise({
        id: 'demo',
        title: '데모 모드',
        description: '자동 모션 플로우',
        difficulty: '테스트',
        duration: 'N/A',
        icon: '🧪',
        color: '#4caf50',
        targetSets: 1,
        targetReps: Number.isFinite(reps) && reps > 0 ? reps : 10,
        exerciseType: exercise
      });
      setSessionPhase('motion-coach');
    }
  }, []);

  /**
   * 2단계: 운동 선택
   */
  const selectExercise = useCallback((exercise: any) => {
    setSelectedExercise(exercise);
    setSessionPhase('motion-coach');
  }, []);

  // 간소화된 프로그램 선택 처리
  const handleSimpleSelectProgram = useCallback((program: any) => {
    console.log('프로그램 선택:', program.id, '운동 수:', program.exercises.length);
    
    // WorkoutContext 초기화
    resetWorkout();
    
    // 세트 초기화
    setCurrentSet(1);
    
    // WorkoutPlan으로 변환하여 Context에 설정
    const workoutPlanData: WorkoutPlan = {
      id: program.id,
      title: program.title,
      exercises: program.exercises.map((exercise: any, index: number) => ({
        id: `${program.id}-${index}`,
        exerciseType: exercise.exerciseType,
        name: exercise.exerciseType,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        restSeconds: exercise.restSeconds || 30,
        duration: exercise.estimatedDuration || 60
      }))
    };
    
    setWorkoutPlan(workoutPlanData);
    
    // 기존 selectedExercise 형태도 유지 (호환성)
    const mapped = {
      id: program.id,
      title: program.title,
      description: program.description,
      difficulty: program.difficulty,
      duration: `${program.exercises.length * 2}분`,
      frequency: `운동 ${program.exercises.length}개`,
      icon: program.icon,
      color: program.color,
      targetSets: program.exercises[0]?.targetSets ?? 3,
      targetReps: program.exercises[0]?.targetReps ?? 10,
      exerciseType: program.exercises[0]?.exerciseType ?? 'squat'
    };
    setSelectedExercise(mapped);
    setSessionPhase('motion-coach');
  }, [setWorkoutPlan, resetWorkout]);

  // 기존 handleSelectProgram은 호환성을 위해 유지
  const handleSelectProgram = useCallback((program: SelectorWorkoutProgram) => {
    // WorkoutPlan으로 변환하여 Context에 설정
    const workoutPlanData: WorkoutPlan = {
      id: program.id,
      title: program.title,
      exercises: program.exercises.map((exercise, index) => ({
        id: `${program.id}-${index}`,
        exerciseType: exercise.exerciseType,
        name: exercise.exerciseType,
        targetSets: exercise.targetSets,
        targetReps: exercise.targetReps,
        restSeconds: exercise.restSeconds || 30,
        duration: exercise.estimatedDuration
      }))
    };
    
    setWorkoutPlan(workoutPlanData);
    
    // 기존 selectedExercise 형태도 유지 (호환성)
    const primaryExercise = program.exercises[0];
    const mapped = {
      id: program.id,
      title: program.title,
      description: program.description,
      difficulty: program.difficulty,
      duration: `${program.estimatedDuration}분`,
      frequency: `운동 ${program.exercises.length}개`,
      icon: program.icon,
      color: program.color,
      targetSets: primaryExercise?.targetSets ?? 3,
      targetReps: primaryExercise?.targetReps ?? 10,
      exerciseType: primaryExercise?.exerciseType ?? 'squat'
    };
    setSelectedExercise(mapped);
    setSessionPhase('motion-coach');
  }, [setWorkoutPlan]);

  /**
   * 3단계: 세트 완료 처리 (MotionCoach에서 호출)
   */
  const handleSetComplete = useCallback(() => {
    const activeExercise = currentExercise || selectedExercise;
    const targetSets = activeExercise?.targetSets || 3;
    
    console.log(`세트 완료: ${currentSet}/${targetSets}`);
    
    if (currentSet < targetSets) {
      // 다음 세트로 이동
      setCurrentSet(prev => prev + 1);
      setSessionPhase('rest'); // 휴식 단계로 이동
    }
    // else: 모든 세트 완료시 MotionCoach에서 onSessionComplete 호출
  }, [currentSet, currentExercise, selectedExercise]);
  
  /**
   * 3단계: MotionCoach 세션 완료 처리 (멀티 운동 지원)
   */
  const handleMotionCoachComplete = useCallback((motionCoachSessionData: any) => {
    console.log('MotionCoach 완료:', motionCoachSessionData);
    console.log('현재 운동 인덱스:', currentExerciseIndex, '전체 운동 수:', workoutPlan?.exercises.length);
    
    // 현재 운동의 세션 데이터를 누적
    const updatedSessionData = {
      ...sessionData,
      exercises: [...(sessionData?.exercises || []), motionCoachSessionData],
      selectedExercise: selectedExercise,
      totalExercises: workoutPlan?.exercises.length || 1,
      workoutPlan: workoutPlan
    };
    setSessionData(updatedSessionData);
    
    // 다음 운동이 있는지 확인
    if (workoutPlan && currentExerciseIndex < workoutPlan.exercises.length - 1) {
      // 다음 운동으로 이동하고 휴식 시간 시작
      console.log('다음 운동으로 이동');
      goToNextExercise();
      setCurrentSet(1); // 새 운동 시작시 세트 1로 초기화
      
      // 다음 운동 정보를 selectedExercise에 설정
      const nextExercise = workoutPlan.exercises[currentExerciseIndex + 1];
      const nextSelectedExercise = {
        ...selectedExercise,
        targetSets: nextExercise.targetSets,
        targetReps: nextExercise.targetReps,
        exerciseType: nextExercise.exerciseType,
        restSeconds: nextExercise.restSeconds || 30
      };
      setSelectedExercise(nextSelectedExercise);
      
      setSessionPhase('rest'); // 운동간 휴식 (다음 운동 준비)
    } else {
      // 모든 운동 완료
      console.log('모든 운동 완료 - 결과 페이지로 이동');
      setSessionPhase('completed');
      
      if (onSessionComplete) {
        onSessionComplete(updatedSessionData);
      }
    }
  }, [selectedExercise, onSessionComplete, workoutPlan, currentExerciseIndex, goToNextExercise, sessionData]);

  /**
   * 새로운 운동 세션 시작
   */
  const startNewSession = useCallback(() => {
    setSessionPhase('recommendations');
    setSelectedExercise(null);
    setSessionData(null);
    setError(null);
  }, []);

  // API를 통해 운동 추천 받기
  const fetchWorkoutRecommendation = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 사용자 정보 기반 추천 데이터 구성
      const requestData = {
        goal: user.goal || 'diet',
        targetDuration: 45,
        experience: user.experience || user.experienceLevel || 'intermediate',
        weight: user.weight || 70,
        height: user.height || 170,
        age: user.age || 30
      };
      
      const response = await apiClient.post(API_ENDPOINTS.WORKOUT_RECOMMEND, requestData);
      
      if (response.data.success && response.data.data) {
        const recommendationData = response.data.data;
        
        // 추천된 운동을 프로그램 형태로 변환
        if (recommendationData.workoutPlan && recommendationData.workoutPlan.main && recommendationData.workoutPlan.main.exercises) {
          const exercises = recommendationData.workoutPlan.main.exercises.map((ex: any) => ({
            exerciseType: ex.name === '스쿼트' ? 'squat' : 
                          ex.name === '푸시업' ? 'pushup' : 
                          ex.name === '플랭크' ? 'plank' : 
                          ex.name === '마운틴 클라이머' ? 'mountain_climber' : 
                          ex.name === '런지' ? 'lunge' : 
                          ex.name === '칼프 레이즈' ? 'calf_raise' :
                          ex.name === '버피' ? 'burpee' : 'squat',
            targetSets: ex.sets || 3,
            targetReps: ex.reps || 10,
            restSeconds: ex.restSeconds || 30
          }));
          
          setRecommendedProgram({
            id: "ai_recommended",
            title: "AI 맞춤 추천",
            description: recommendationData.recommendations?.join(', ') || "당신에게 최적화된 운동",
            difficulty: recommendationData.userProfile?.experienceLevel || "맞춤형",
            icon: "🤖",
            color: "#FF6B6B",
            exercises: exercises
          });
          
          console.log('운동 추천 성공:', exercises.length + '개 운동');
        }
      }
    } catch (error) {
      console.error('운동 추천 API 오류:', error);
      // 실패 시 기본 프로그램 사용
      setRecommendedProgram({
        id: "ai_recommended",
        title: "AI 맞춤 추천",
        description: "당신에게 최적화된 운동",
        difficulty: "맞춤형",
        icon: "🤖",
        color: "#FF6B6B",
        exercises: [
          { exerciseType: 'squat', targetSets: 3, targetReps: 12, restSeconds: 30 },
          { exerciseType: 'lunge', targetSets: 3, targetReps: 10, restSeconds: 30 },
          { exerciseType: 'pushup', targetSets: 3, targetReps: 10, restSeconds: 30 },
          { exerciseType: 'plank', targetSets: 3, targetReps: 30, restSeconds: 30 },
          { exerciseType: 'burpee', targetSets: 2, targetReps: 8, restSeconds: 45 }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // 컴포넌트 마운트 시 운동 추천 받기
  useEffect(() => {
    if (user && sessionPhase === 'loading') {
      fetchWorkoutRecommendation();
      setSessionPhase('recommendations');
    }
  }, [user, sessionPhase, fetchWorkoutRecommendation]);

  // 멀티 운동 세션에서 운동 진행 상황 모니터링
  useEffect(() => {
    if (workoutPlan && currentExercise && sessionPhase === 'rest') {
      console.log(`다음 운동 준비: ${currentExercise.name} (${currentExerciseIndex + 1}/${workoutPlan.exercises.length})`);
    }
  }, [currentExercise, currentExerciseIndex, workoutPlan, sessionPhase]);

  // 로딩 중
  if (isLoading || sessionPhase === 'loading') {
    return (
      <div className="integrated-workout-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>🤖 AI가 당신을 위한 맞춤 운동을 준비하고 있어요...</h2>
          <p>잠시만 기다려주세요</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="integrated-workout-error">
        <div className="error-content">
          <h2>😓 문제가 발생했습니다</h2>
          <p>{error}</p>
          <button onClick={startNewSession} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 1단계: 간소화된 운동 프로그램 선택
  if (sessionPhase === 'recommendations') {
    // 표시할 프로그램 결정 (AI 추천이 있으면 첫 번째로 표시)
    const displayPrograms = recommendedProgram 
      ? [recommendedProgram, ...workoutPrograms.slice(1)]
      : workoutPrograms;
    
    return (
      <div className="integrated-workout-recommendations">
        <div className="recommendations-header">
          <h1>🎯 운동 프로그램 선택</h1>
          <p>{recommendedProgram ? 'AI가 당신을 위해 맞춤 운동을 준비했습니다!' : '원하는 운동 유형을 선택하세요'}</p>
        </div>

        <div className="workout-programs">
          <div className="programs-grid">
            {displayPrograms.map((program) => (
              <div 
                key={program.id} 
                className="program-card" 
                onClick={() => handleSimpleSelectProgram(program)}
                style={{ borderColor: program.color }}
              >
                <div className="program-header">
                  <span className="program-icon" style={{ color: program.color }}>
                    {program.icon}
                  </span>
                  <h3>{program.title}</h3>
                </div>
                <div className="program-details">
                  <p className="program-description">{program.description}</p>
                  <div className="program-specs">
                    <div className="spec-item">
                      <span className="label">난이도:</span>
                      <span className="value">{program.difficulty}</span>
                    </div>
                    <div className="spec-item">
                      <span className="label">운동:</span>
                      <span className="value">{program.exercises.length}개</span>
                    </div>
                  </div>
                </div>
                <div className="select-button">
                  <span>🚀 운동 시작하기</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 2단계: 휴식 시간
  if (sessionPhase === 'rest' && workoutPlan && currentExercise) {
    return (
      <div className="integrated-workout-rest">
        <RestTimer
          duration={currentExercise.restSeconds}
          onComplete={() => setSessionPhase('motion-coach')}
          onSkip={() => setSessionPhase('motion-coach')}
          nextExercise={{
            name: currentExercise.name,
            set: currentSet
          }}
        />
      </div>
    );
  }

  // 3단계: MotionCoach 실행 (WorkoutContext 기반)
  if (sessionPhase === 'motion-coach' && (currentExercise || selectedExercise)) {
    const activeExercise = currentExercise || selectedExercise;
    const exerciseName = activeExercise?.exerciseType || activeExercise?.name || 'squat';
    
    // Convert program selection to exercise type for MotionCoach
    const getExerciseType = (programId: string) => {
      const exerciseTypeMap: { [key: string]: string } = {
        'beginner': 'squat',
        'strong-curves': 'squat', 
        'strength': 'pushup',
        'pull-up': 'pushup',
        'endurance': 'burpee'
      };
      return exerciseTypeMap[programId] || 'squat';
    };

    return (
      <div className="integrated-workout-motion-coach">
        <div className="motion-coach-header">
          <h2>🤖 모션 코치: {activeExercise?.name || activeExercise?.title || '운동'}</h2>
          <div className="exercise-info">
            {workoutPlan && (
              <div className="exercise-progress">
                <span>운동 {currentExerciseIndex + 1} / {workoutPlan.exercises.length}</span>
                <span>현재: {currentSet} / {activeExercise?.targetSets}세트</span>
                <span>목표: {activeExercise?.targetSets}세트 × {activeExercise?.targetReps}회</span>
              </div>
            )}
            {selectedExercise && (
              <div>
                <span>{selectedExercise.difficulty} 난이도</span>
                <span>기간: {selectedExercise.duration}</span>
              </div>
            )}
          </div>
          <button 
            onClick={() => setSessionPhase('recommendations')} 
            className="back-button"
          >
            ← 프로그램 선택으로 돌아가기
          </button>
        </div>
        
        <div className="motion-coach-wrapper">
          <MotionCoach 
            exerciseType={activeExercise?.exerciseType || getExerciseType(activeExercise?.id || 'squat')}
            targetSets={activeExercise?.targetSets || 3}
            targetReps={activeExercise?.targetReps || 10}
            currentSet={currentSet}
            onSetComplete={handleSetComplete}
            onSessionComplete={handleMotionCoachComplete}
          />
        </div>
      </div>
    );
  }

  // 4단계: 세션 완료
  if (sessionPhase === 'completed') {
    // sessionData가 없어도 기본값으로 표시
    const completedData = sessionData || {
      totalReps: 0,
      duration: 0,
      caloriesBurned: 0,
      averageFormScore: 0,
      formCorrectionsCount: 0,
      exercises: []
    };
    
    // 운동별 데이터 집계
    const totalReps = completedData.exercises?.reduce((sum: number, ex: any) => 
      sum + (ex.totalReps || ex.completedReps || 0), 0) || completedData.totalReps || 0;
    const totalDuration = completedData.exercises?.reduce((sum: number, ex: any) => 
      sum + (ex.duration || 0), 0) || completedData.duration || 0;
    const totalCalories = completedData.exercises?.reduce((sum: number, ex: any) => 
      sum + (ex.caloriesBurned || 0), 0) || completedData.caloriesBurned || 0;
    
    return (
      <div className="integrated-workout-completed">
        <div className="completion-content">
          <div className="completion-header">
            <h1>🎉 운동 세션 완료!</h1>
            <p>훌륭한 운동이었어요!</p>
          </div>

          <div className="session-summary">
            <div className="summary-item">
              <span className="icon">🏋️</span>
              <span className="label">프로그램:</span>
              <span className="value">{selectedExercise?.title || workoutPlan?.title || '운동'}</span>
            </div>
            <div className="summary-item">
              <span className="icon">📊</span>
              <span className="label">완료한 운동:</span>
              <span className="value">{completedData.exercises?.length || 1}개</span>
            </div>
            <div className="summary-item">
              <span className="icon">🔢</span>
              <span className="label">총 횟수:</span>
              <span className="value">{totalReps}회</span>
            </div>
            <div className="summary-item">
              <span className="icon">⏱️</span>
              <span className="label">소요 시간:</span>
              <span className="value">{Math.floor(totalDuration / 60)}분 {totalDuration % 60}초</span>
            </div>
            <div className="summary-item">
              <span className="icon">🔥</span>
              <span className="label">소모 칼로리:</span>
              <span className="value">{Math.round(totalCalories)} kcal</span>
            </div>
            {completedData.averageFormScore > 0 && (
              <div className="summary-item">
                <span className="icon">🎯</span>
                <span className="label">평균 정확도:</span>
                <span className="value">{(completedData.averageFormScore * 100).toFixed(1)}%</span>
              </div>
            )}
          </div>

          <div className="next-actions">
            <button onClick={startNewSession} className="primary-button">
              🚀 다음 운동 추천받기
            </button>
            <button 
              onClick={() => setSessionPhase('recommendations')} 
              className="secondary-button"
            >
              📊 운동 추천 다시보기
            </button>
          </div>

          <div className="motivation-message">
            <p>💪 꾸준한 운동으로 더 건강한 내일을 만들어가세요!</p>
            <p>🤖 AI가 당신의 발전을 기록하고 있으니 계속 화이팅!</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default IntegratedWorkoutSession;