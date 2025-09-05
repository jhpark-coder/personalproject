import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../../../context/UserContext';
import { useWorkout } from '../../../context/WorkoutContext';
import { useWorkoutStateMachine } from '../hooks/useWorkoutStateMachine';
import { API_ENDPOINTS } from '../../../config/api';
import { apiClient } from '../../../utils/axiosConfig';
import { getUserData } from '../../../utils/userProfile';
import MotionCoach from './MotionCoachV2';
import RestTimer from './RestTimer';
import WorkoutFeedbackModal from './WorkoutFeedbackModal';
import WorkoutSessionSummary from './WorkoutSessionSummary';
import type { WorkoutPlan } from '../../../context/WorkoutContext';
import './IntegratedWorkoutSession.css';

interface IntegratedWorkoutSessionProps {
  onSessionComplete?: (sessionData: any) => void;
}

interface FeedbackData {
  satisfaction: number;
  difficulty: number;
  comments?: string;
  overallDifficulty?: number;
  muscleSoreness?: string;
  energyAfter?: number;
  wouldRepeat?: boolean;
}

const IntegratedWorkoutSessionV2: React.FC<IntegratedWorkoutSessionProps> = ({ onSessionComplete }) => {
  const { user } = useUser();
  const { setWorkoutPlan, resetWorkout } = useWorkout();
  
  // 상태 머신 사용
  const {
    state,
    currentSet,
    currentExerciseIndex,
    currentExercise,
    workoutPlan,
    exerciseResults,
    sessionData,
    getPhaseForUI,
    isResting,
    isTransitioningExercise,
    selectProgram,
    startExercise,
    completeSet,
    endRest,
    handleSessionComplete,
    showSummary,
    showFeedback,
    reset
  } = useWorkoutStateMachine({
    onSessionComplete
  });
  
  const [recommendedProgram, setRecommendedProgram] = useState<any>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [completedSessionData, setCompletedSessionData] = useState<any>(null);
  const [sessionStartTime] = useState(Date.now());
  const [isFeedbackProcessing, setIsFeedbackProcessing] = useState(false);
  const [autoSaveSessionId, setAutoSaveSessionId] = useState<string | null>(null); // 자동 저장된 세션 ID
  
  // 기본 운동 프로그램
  const workoutPrograms = [
    {
      id: "ai_recommended",
      title: "AI 맞춤 추천",
      description: "당신에게 최적화된 운동",
      difficulty: "맞춤형",
      icon: "🤖",
      color: "#FF6B6B",
      exercises: [
        { exerciseType: 'squat', targetSets: 3, targetReps: 10, restSeconds: 30 }
      ]
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
      id: "test_beginner",
      title: "🧪 시연용 테스트",
      description: "서서 하는 운동 - 각 5회씩",
      difficulty: "쉬움",
      icon: "🧪",
      color: "#00C896",
      exercises: [
        { exerciseType: 'squat', targetSets: 1, targetReps: 5, restSeconds: 5 },
        { exerciseType: 'lunge', targetSets: 1, targetReps: 5, restSeconds: 5 },
        { exerciseType: 'calf_raise', targetSets: 1, targetReps: 5, restSeconds: 5 }
      ]
    }
  ];
  
  // 운동 이름 한글 변환
  const getExerciseDisplayName = (exerciseType: string): string => {
    const nameMap: Record<string, string> = {
      'squat': '스쿼트',
      'lunge': '런지',
      'pushup': '푸시업',
      'plank': '플랭크',
      'calf_raise': '카프 레이즈',
      'burpee': '버피',
      'mountain_climber': '마운틴 클라이머'
    };
    return nameMap[exerciseType] || exerciseType;
  };
  
  // 프로그램 선택 처리
  const handleSelectProgram = useCallback((program: any) => {
    console.log('프로그램 선택:', program.id);
    
    // WorkoutPlan 설정
    const workoutPlanData: WorkoutPlan = {
      id: program.id,
      title: program.title,
      exercises: (program.exercises || []).map((exercise: any, index: number) => ({
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
    setSelectedExercise(program);
    selectProgram(program);
    startExercise();
  }, [setWorkoutPlan, selectProgram, startExercise]);
  
  // 자동 저장 함수 (운동 완료 시 즉시 호출)
  const autoSaveSession = useCallback(async (sessionData: any) => {
    console.log('[자동 저장] 시작:', sessionData);
    
    const autoSaveRequest = {
      programId: workoutPlan?.id || 'custom',
      programTitle: workoutPlan?.title || '운동 세션',
      totalDuration: Math.floor((Date.now() - sessionStartTime) / 1000),
      totalExercises: exerciseResults.length,
      exercises: exerciseResults,
      isAutoSave: true // 자동 저장 플래그
    };
    
    try {
      const response = await apiClient.post('/api/workout/auto-save', autoSaveRequest);
      if (response.data.success) {
        console.log('[자동 저장] 성공, sessionId:', response.data.sessionId);
        setAutoSaveSessionId(response.data.sessionId);
        // localStorage에서 실패 데이터 제거
        localStorage.removeItem('fitmate_pending_workout');
        return { success: true, sessionId: response.data.sessionId };
      }
    } catch (error) {
      console.error('[자동 저장] 실패, localStorage에 임시 저장:', error);
      // 실패 시 localStorage에 저장
      localStorage.setItem('fitmate_pending_workout', JSON.stringify({
        ...autoSaveRequest,
        failedAt: new Date().toISOString()
      }));
      return { success: false, pending: true };
    }
  }, [workoutPlan, sessionStartTime, exerciseResults]);
  
  // 세트 완료 처리
  const handleSetComplete = useCallback(() => {
    console.log(`세트 완료 호출 - 현재 세트: ${currentSet}, 목표 세트: ${currentExercise?.targetSets || 1}`);
    // State Machine의 completeSet 호출 - 이것이 상태 전환을 처리함
    completeSet();
  }, [currentSet, currentExercise, completeSet]);
  
  // MotionCoach 세션 완료 처리
  const handleMotionCoachComplete = useCallback(async (motionCoachSessionData: any) => {
    console.log('🎯 MotionCoach 완료:', {
      state,
      currentSet,
      sessionData: motionCoachSessionData
    });
    
    // 자동 저장 실행
    await autoSaveSession(motionCoachSessionData);
    
    // 세션 완료 처리
    handleSessionComplete(motionCoachSessionData);
  }, [state, currentSet, handleSessionComplete, autoSaveSession]);
  
  // 피드백 제출 처리 (수동 저장)
  const handleFeedbackSubmit = useCallback(async (feedback: FeedbackData) => {
    console.log('[수동 저장] 피드백 제출 시작:', feedback);
    console.log('[수동 저장] 자동 저장 sessionId:', autoSaveSessionId);
    console.log('[수동 저장] completedSessionData 존재:', !!completedSessionData);
    
    // 로딩 스피너 표시
    setIsFeedbackProcessing(true);
    
    // localStorage에서 실패한 자동 저장 데이터 확인
    const pendingWorkout = localStorage.getItem('fitmate_pending_workout');
    const pendingData = pendingWorkout ? JSON.parse(pendingWorkout) : null;
    
    // completedSessionData가 이미 있으면 (시연 테스트의 경우) 그 데이터에 피드백만 추가
    if (completedSessionData) {
      console.log('[수동 저장] 시연 테스트 경로 - 피드백과 함께 저장');
      
      // 시연 테스트용 수동 저장 요청
      const sessionRequest = {
        sessionId: autoSaveSessionId, // 자동 저장된 세션 ID
        pendingData: pendingData, // 실패한 자동 저장 데이터 (있을 경우)
        programId: completedSessionData.programId || 'demo_test',
        programTitle: completedSessionData.programTitle || '시연 테스트',
        totalDuration: completedSessionData.totalDuration,
        totalCalories: completedSessionData.totalCalories || completedSessionData.caloriesBurned,
        exercises: completedSessionData.exerciseResults.map(result => ({
          exerciseType: result.exerciseType,
          exerciseName: result.exerciseName,
          completedSets: result.completedSets,
          targetSets: result.targetSets,
          completedReps: result.completedReps,
          targetReps: result.targetReps,
          averageFormScore: result.averageFormScore,
          completionRate: result.completionRate,
          duration: result.duration || 60
        })),
        feedback
      };
      
      try {
        const response = await apiClient.post('/api/workout/complete-save', sessionRequest);
        if (response.data.success) {
          console.log('[수동 저장] 시연 테스트 저장 성공');
          
          // localStorage 정리
          localStorage.removeItem('fitmate_pending_workout');
          
          // 저장된 데이터로 업데이트
          const updatedData = {
            ...completedSessionData,
            feedback,
            sessionId: response.data.sessionId || response.data.data?.sessionId
          };
          setCompletedSessionData(updatedData);
          
          // 운동 완료 이벤트 발생 (캘린더, 마이페이지 연동)
          window.dispatchEvent(new CustomEvent('workoutCompleted', {
            detail: {
              sessionData: response.data.data || response.data,
              exercises: completedSessionData.exerciseResults
            }
          }));
        }
      } catch (error) {
        console.error('[수동 저장] 시연 테스트 저장 실패:', error);
      }
      
      // setTimeout으로 state 업데이트가 완료된 후 showSummary 호출
      setTimeout(() => {
        console.log('[피드백 제출] 모달 닫고 showSummary 호출 (시연)');
        setShowFeedbackModal(false); // 모달을 먼저 닫음
        setIsFeedbackProcessing(false);
        showSummary();
      }, 2000); // 2초간 로딩 스피너 표시
      return;
    }
    
    const totalDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    
    // 수동 저장 요청 데이터 구성
    const sessionRequest = {
      sessionId: autoSaveSessionId, // 자동 저장된 세션 ID (있을 경우)
      pendingData: pendingData, // 실패한 자동 저장 데이터 (있을 경우)
      programId: workoutPlan?.id || 'custom',
      programTitle: workoutPlan?.title || '운동 세션',
      totalDuration,
      totalExercises: exerciseResults.length,
      exercises: exerciseResults,
      feedback
    };
    
    try {
      const response = await apiClient.post('/api/workout/complete-save', sessionRequest);
      if (response.data.success) {
        console.log('[수동 저장] 성공');
        
        // localStorage 정리
        localStorage.removeItem('fitmate_pending_workout');
        
        setCompletedSessionData(response.data.data || response.data);
        
        // 모달 닫고 로딩 스피너 숨기고 요약 화면으로 이동
        setShowFeedbackModal(false);
        setIsFeedbackProcessing(false);
        showSummary();
        
        // 체크리스트 자동 체크 업데이트 이벤트 발생
        const checklistState: Record<string, boolean> = {};
        exerciseResults.forEach((result, index) => {
          if (result.completionRate >= 50) { // 50% 이상 완료 시 체크
            checklistState[`exercise_${index}`] = true;
          }
        });
        
        // 운동 완료 이벤트 발생 (캘린더, 마이페이지 연동)
        window.dispatchEvent(new CustomEvent('workoutCompleted', {
          detail: {
            sessionData: response.data.data,
            exercises: exerciseResults
          }
        }));
        
        // 체크리스트 업데이트 이벤트
        window.dispatchEvent(new CustomEvent('checklistUpdated', { 
          detail: { 
            exerciseType: exerciseResults[0]?.exerciseType,
            checklistState: checklistState
          } 
        }));
      }
    } catch (error) {
      console.error('[수동 저장] 실패:', error);
      // 에러가 발생해도 요약 화면으로 이동 (기본 데이터 생성)
      const fallbackData = {
        id: Date.now(),
        programTitle: workoutPlan?.title || '운동 세션',
        totalDuration,
        totalExercises: exerciseResults.length,
        exercises: exerciseResults,
        feedback,
        completedAt: new Date().toISOString()
      };
      setCompletedSessionData(fallbackData);
      setShowFeedbackModal(false);
      setIsFeedbackProcessing(false);
      showSummary();
    }
  }, [sessionStartTime, workoutPlan, exerciseResults, completedSessionData, showSummary, setIsFeedbackProcessing]);
  
  // API를 통한 운동 추천
  const fetchWorkoutRecommendation = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const userData = await getUserData();
      const requestData = {
        goal: userData.goal,
        targetDuration: 45,
        experience: userData.experience,
        weight: userData.weight,
        height: userData.height,
        age: userData.age
      };
      
      const response = await apiClient.post(API_ENDPOINTS.WORKOUT_RECOMMEND, requestData);
      if (response.data.success && response.data.data) {
        // 백엔드 응답 형식을 프론트엔드 형식으로 변환
        const backendData = response.data.data;
        
        // 백엔드 응답 형식 처리 - workoutPlan.main.exercises 또는 exercises 직접 접근
        const exercises = [];
        
        // 먼저 workoutPlan.main.exercises 확인 (템플릿/적응형 추천)
        if (backendData.workoutPlan?.main?.exercises) {
          backendData.workoutPlan.main.exercises.forEach(exercise => {
            exercises.push({
              exerciseType: exercise.name?.toLowerCase().replace(/\s+/g, '_') || 'squat',
              targetSets: exercise.sets || 3,
              targetReps: exercise.reps || 10,
              restSeconds: 30
            });
          });
        } 
        // exercises가 직접 있는 경우 (이전 버전 호환)
        else if (backendData.exercises && Array.isArray(backendData.exercises)) {
          backendData.exercises.forEach(exercise => {
            exercises.push({
              exerciseType: exercise.exerciseType || exercise.name?.toLowerCase().replace(/\s+/g, '_') || 'squat',
              targetSets: exercise.targetSets || exercise.sets || 3,
              targetReps: exercise.targetReps || exercise.reps || 10,
              restSeconds: exercise.restSeconds || 30
            });
          });
        }
        
        // exercises가 비어있으면 기본값 추가
        if (exercises.length === 0) {
          exercises.push({ exerciseType: 'squat', targetSets: 3, targetReps: 10, restSeconds: 30 });
        }
        
        const recommendProgram = {
          id: 'ai_recommended',
          title: 'AI 맞춤 추천',
          description: '당신에게 최적화된 운동',
          difficulty: backendData.userProfile?.fitnessLevel || '중급',
          icon: '🤖',
          color: '#FF6B6B',
          exercises: exercises
        };
        
        setRecommendedProgram(recommendProgram);
      }
    } catch (error) {
      console.error('운동 추천 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // 초기 로드
  useEffect(() => {
    if (user && state === 'idle') {
      fetchWorkoutRecommendation();
    }
  }, [user, state, fetchWorkoutRecommendation]);
  
  // UI 페이즈 결정 - useEffect에서 사용하기 전에 정의해야 함
  const uiPhase = getPhaseForUI();
  
  // 디버그 로그
  console.log('[렌더링 상태]', {
    state,
    uiPhase,
    showFeedbackModal,
    hasCompletedSessionData: !!completedSessionData,
    exerciseResultsCount: exerciseResults.length
  });
  
  // 완료 화면에서 3초 후 자동으로 피드백 모달로 전환 - 모든 Hook은 조건부 return 전에 위치해야 함
  useEffect(() => {
    if (uiPhase === 'completed') {
      const timer = setTimeout(() => {
        console.log('[Hooks Rule Fix v3 - All hooks before returns] 운동 완료 후 피드백 모달로 자동 전환');
        setShowFeedbackModal(true);
        showFeedback();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [uiPhase, showFeedback]);
  
  // 로딩 화면
  if (isLoading) {
    return (
      <div className="integrated-workout-loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <h2>🤖 AI가 맞춤 운동을 준비하고 있어요...</h2>
        </div>
      </div>
    );
  }
  
  // 에러 화면
  if (error) {
    return (
      <div className="integrated-workout-error">
        <div className="error-content">
          <h2>😓 문제가 발생했습니다</h2>
          <p>{error}</p>
          <button onClick={reset} className="retry-button">다시 시도</button>
        </div>
      </div>
    );
  }
  
  // 프로그램 선택 화면
  if (uiPhase === 'recommendations') {
    // 안전하게 배열 생성
    const displayPrograms = recommendedProgram 
      ? [recommendedProgram, ...workoutPrograms.slice(1).filter(Boolean)].filter(p => p && p.exercises && Array.isArray(p.exercises))
      : workoutPrograms.filter(p => p && p.exercises && Array.isArray(p.exercises));
    
    return (
      <div className="integrated-workout-recommendations">
        <div className="recommendations-header">
          <h1>🎯 운동 프로그램 선택</h1>
          <p>원하는 운동 유형을 선택하세요</p>
        </div>
        <div className="workout-programs">
          <div className="programs-grid">
            {Array.isArray(displayPrograms) && displayPrograms.length > 0 ? displayPrograms.map((program) => (
              <div 
                key={program?.id || Math.random()} 
                className="program-card" 
                onClick={() => handleSelectProgram(program)}
                style={{ borderColor: program?.color || '#ccc' }}
              >
                <div className="program-header">
                  <span className="program-icon">{program?.icon || '🏃'}</span>
                  <h3>{program?.title || '운동 프로그램'}</h3>
                </div>
                <div className="program-details">
                  <p>{program?.description || '설명 없음'}</p>
                  <div className="program-specs">
                    <div className="spec-item">
                      <span className="label">난이도:</span>
                      <span className="value">{program?.difficulty || '보통'}</span>
                    </div>
                    <div className="spec-item">
                      <span className="label">운동:</span>
                      <span className="value">{program?.exercises?.length || 0}개</span>
                    </div>
                  </div>
                </div>
              </div>
            )) : (
              <div className="no-programs">
                <p>운동 프로그램을 불러오는 중...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // 휴식 화면
  if (uiPhase === 'rest') {
    const activeExercise = currentExercise;
    const restDuration = activeExercise?.restSeconds || 30;
    
    // 다음 정보 결정
    const nextInfo = isTransitioningExercise()
      ? `다음 운동: ${getExerciseDisplayName(workoutPlan?.exercises?.[workoutPlan.exercises.findIndex(e => e === currentExercise) + 1]?.exerciseType || '')}`
      : `다음: ${currentSet + 1}세트`;
    
    return (
      <div className="integrated-workout-rest">
        <RestTimer
          duration={restDuration}
          onComplete={endRest}
          onSkip={endRest}
          nextExercise={{
            name: nextInfo,
            set: currentSet
          }}
        />
      </div>
    );
  }
  
  // 피드백 모달을 먼저 체크 (가장 높은 우선순위)
  if (showFeedbackModal) {
    return (
      <WorkoutFeedbackModal
        isOpen={true}
        isProcessing={isFeedbackProcessing}
        onClose={async () => {
          console.log('[피드백 스킵] 건너뛰기 버튼 클릭 - 로딩 스피너 표시');
          setIsFeedbackProcessing(true); // 로딩 스피너 표시 (모달은 유지)
          
          // 세션 데이터 준비
          let finalSessionData = completedSessionData;
          
          // completedSessionData가 없으면 기본 데이터 생성
          if (!finalSessionData) {
            const totalDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
            finalSessionData = {
              id: Date.now(),
              programId: 'default',
              programTitle: workoutPlan?.title || '운동 세션',
              totalDuration,
              totalExercises: exerciseResults.length || 1,
              totalSets: exerciseResults.reduce((acc, result) => acc + (result.completedSets || 0), 0) || 3,
              totalReps: exerciseResults.reduce((acc, result) => acc + ((result.completedSets || 0) * (result.targetReps || 0)), 0) || 30,
              totalCalories: (exerciseResults.length || 1) * 50,
              caloriesBurned: (exerciseResults.length || 1) * 50,
              overallGrade: 'B',
              completionRate: 75,
              accuracy: 80,
              averageFormScore: 75,
              improvements: [],
              nextRecommendations: [],
              exerciseResults: exerciseResults.length > 0 ? exerciseResults.map(result => ({
                ...result,
                grade: 'B',
                completionRate: 75,
                accuracy: 80
              })) : [{
                exerciseType: 'squat',
                exerciseName: '스쿼트',
                completedSets: 3,
                targetSets: 3,
                targetReps: 10,
                totalReps: 30,
                grade: 'B',
                completionRate: 75,
                accuracy: 80,
                averageFormScore: 75
              }],
              feedback: null,
              completedAt: new Date().toISOString()
            };
            console.log('[피드백 스킵] 기본 세션 데이터 생성:', finalSessionData);
            setCompletedSessionData(finalSessionData);
          }
          
          // DB 저장 시도 (시연 테스트 포함)
          if (finalSessionData) {
            console.log('[피드백 스킵] DB 저장 진행');
            
            const sessionRequest = {
              programId: finalSessionData.programId || 'demo_test',
              programTitle: finalSessionData.programTitle || '시연 테스트',
              totalDuration: finalSessionData.totalDuration,
              totalCalories: finalSessionData.totalCalories || finalSessionData.caloriesBurned,
              exercises: finalSessionData.exerciseResults.map(result => ({
                exerciseType: result.exerciseType,
                exerciseName: result.exerciseName,
                completedSets: result.completedSets,
                targetSets: result.targetSets,
                completedReps: result.completedReps,
                targetReps: result.targetReps,
                averageFormScore: result.averageFormScore,
                completionRate: result.completionRate,
                duration: result.duration || 60
              })),
              feedback: null // 건너뛰기는 피드백 없음
            };
            
            try {
              const response = await apiClient.post('/api/workout/complete-integrated-session', sessionRequest);
              if (response.data.success) {
                console.log('[피드백 스킵] DB 저장 성공');
                
                // 저장된 데이터로 업데이트
                const updatedData = {
                  ...finalSessionData,
                  sessionId: response.data.data.sessionId
                };
                setCompletedSessionData(updatedData);
                
                // 운동 완료 이벤트 발생
                window.dispatchEvent(new CustomEvent('workoutCompleted', {
                  detail: {
                    sessionData: response.data.data,
                    exercises: finalSessionData.exerciseResults
                  }
                }));
              }
            } catch (error) {
              console.error('[피드백 스킵] DB 저장 실패:', error);
            }
          }
          
          // 2초 후 모달 닫고 요약 화면으로 이동
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          console.log('[피드백 스킵] 모달 닫고 showSummary 호출');
          setShowFeedbackModal(false);
          setIsFeedbackProcessing(false);
          showSummary();
        }}
        onSubmit={handleFeedbackSubmit}
        workoutName={workoutPlan?.title || '운동'}
      />
    );
  }

  // 요약 화면 체크 (피드백 후에 표시됨)
  if (uiPhase === 'summary') {
    console.log('[요약 화면 체크] uiPhase:', uiPhase, 'completedSessionData:', completedSessionData);
    
    if (!completedSessionData) {
      console.warn('[요약 화면] completedSessionData가 없음! 기본 데이터 생성');
      // 데이터가 없으면 기본 데이터 생성
      const fallbackData = {
        totalDuration: 180,
        totalExercises: 1,
        totalSets: 3,
        totalReps: 30,
        totalCalories: 50,
        caloriesBurned: 50,
        averageFormScore: 75,
        overallGrade: 'B',
        completionRate: 75,
        accuracy: 80,
        improvements: ['자세 개선이 필요합니다'],
        nextRecommendations: ['다음에는 세트를 늘려보세요'],
        exerciseResults: [{
          exerciseType: 'squat',
          exerciseName: '스쿼트',
          completedSets: 3,
          targetSets: 3,
          targetReps: 10,
          totalReps: 30,
          grade: 'B',
          completionRate: 75,
          accuracy: 80,
          averageFormScore: 75
        }],
        feedback: null,
        completedAt: new Date().toISOString()
      };
      setCompletedSessionData(fallbackData);
      return <div>데이터 준비 중...</div>;
    }
    
    return (
      <WorkoutSessionSummary
        summary={completedSessionData}
        onClose={() => window.location.href = '#/dashboard'}
        onNewWorkout={reset}
      />
    );
  }

  // 운동 실행 화면
  if (uiPhase === 'motion-coach') {
    const activeExercise = currentExercise || selectedExercise;
    
    console.log('[IntegratedWorkoutSessionV2] Rendering Motion Coach with:', {
      currentExerciseIndex,
      currentExercise,
      activeExercise,
      state,
      currentSet,
      workoutPlan
    });
    
    if (!activeExercise) {
      return (
        <div className="error-content">
          <h2>운동을 선택해주세요</h2>
          <button onClick={reset}>처음으로</button>
        </div>
      );
    }
    
    return (
      <div className="integrated-workout-motion-coach">
        <div className="motion-coach-header minimal">
          <div className="exercise-quick-info">
            <h3>{getExerciseDisplayName(activeExercise?.exerciseType || 'squat')}</h3>
            <span className="progress-badge">
              세트 {currentSet}/{activeExercise?.targetSets || 3}
            </span>
          </div>
        </div>
        
        <div className="motion-coach-wrapper">
          <MotionCoach 
            key={`motion-${state}-${currentSet}-${Date.now()}`}
            exerciseType={activeExercise?.exerciseType || 'squat'}
            targetSets={activeExercise?.targetSets || 3}
            targetReps={activeExercise?.targetReps || 10}
            currentSet={currentSet}
            onSetComplete={handleSetComplete}
            onSessionComplete={handleMotionCoachComplete}
          />
        </div>
        
        {/* 시연용 테스트 버튼 - 개발/테스트용 */}
        <div style={{ 
          position: 'absolute', 
          bottom: '20px', 
          right: '20px', 
          zIndex: 1000,
          backgroundColor: 'rgba(255,255,255,0.9)',
          padding: '10px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
        }}>
          <button 
            onClick={() => {
              console.log('[시연 테스트] 운동 완료 시뮬레이션 시작');
              
              // 세션 데이터 생성 - 3가지 운동 모두 완료한 것으로 시뮬레이션
              const allExercises = workoutPlan?.exercises || [
                { exerciseType: 'squat', targetSets: 3, targetReps: 10 },
                { exerciseType: 'pushup', targetSets: 3, targetReps: 10 },
                { exerciseType: 'plank', targetSets: 3, targetReps: 30 }
              ];
              
              // 운동별 예상 시간 계산 (초 단위)
              const exerciseTimeMap = {
                'squat': 180,        // 3분
                'lunge': 210,        // 3분 30초
                'pushup': 150,       // 2분 30초
                'plank': 120,        // 2분
                'calf_raise': 90,    // 1분 30초
                'burpee': 240,       // 4분
                'mountain_climber': 180  // 3분
              };
              
              // 총 운동 시간 계산 (운동 시간 + 휴식 시간)
              let totalExerciseTime = 0;
              allExercises.forEach(exercise => {
                const exerciseTime = exerciseTimeMap[exercise.exerciseType] || 180; // 기본 3분
                const restTime = (exercise.targetSets - 1) * 30; // 세트 간 휴식 30초
                totalExerciseTime += exerciseTime + restTime;
              });
              
              // 운동 간 전환 시간 추가 (운동당 30초)
              const transitionTime = (allExercises.length - 1) * 30;
              const totalDurationInSeconds = totalExerciseTime + transitionTime + 
                                            Math.floor(Math.random() * 120); // 0-2분 랜덤 추가
              
              // 시작/종료 시간 계산
              const endTime = Date.now();
              const startTime = endTime - (totalDurationInSeconds * 1000);
              
              // 모든 운동에 대한 결과 생성
              const simulatedExerciseResults = allExercises.map((exercise, index) => ({
                exerciseType: exercise.exerciseType,
                exerciseName: getExerciseDisplayName(exercise.exerciseType),
                completedSets: exercise.targetSets || 3,
                targetSets: exercise.targetSets || 3,
                targetReps: exercise.targetReps || 10,
                totalReps: (exercise.targetSets || 3) * (exercise.targetReps || 10),
                averageFormScore: 80 + Math.floor(Math.random() * 20), // 80-99 사이 랜덤 점수
                accuracy: 85 + Math.floor(Math.random() * 15), // 85-99 사이 랜덤 정확도
                completionRate: 100
              }));
              
              // 전체 통계 계산
              const totalSets = simulatedExerciseResults.reduce((sum, ex) => sum + ex.completedSets, 0);
              const totalReps = simulatedExerciseResults.reduce((sum, ex) => sum + ex.totalReps, 0);
              const avgFormScore = Math.round(
                simulatedExerciseResults.reduce((sum, ex) => sum + ex.averageFormScore, 0) / simulatedExerciseResults.length
              );
              
              const simulatedSessionData = {
                startTime: startTime,
                endTime: endTime,
                duration: totalDurationInSeconds, // 계산된 총 운동 시간
                totalDuration: totalDurationInSeconds, // WorkoutSessionSummary가 사용하는 필드
                programId: workoutPlan?.id || 'test_program',
                programName: workoutPlan?.title || '테스트 프로그램',
                totalExercises: allExercises.length, // 총 운동 개수
                totalSets: totalSets, // 총 세트 수
                totalReps: totalReps, // 총 반복 횟수
                caloriesBurned: 50 * allExercises.length, // 운동당 50칼로리
                averageFormScore: avgFormScore, // 평균 자세 점수
                improvements: [ // 개선 사항
                  '자세를 더 깊게 내려가세요',
                  '속도를 일정하게 유지하세요',
                  '호흡을 규칙적으로 하세요'
                ],
                nextRecommendations: [ // 다음 추천
                  '다음 번에는 세트를 1개 더 늘려보세요',
                  '휴식 시간을 5초 줄여보세요',
                  '더 어려운 변형 동작에 도전해보세요'
                ],
                exerciseResults: simulatedExerciseResults,
                totalCalories: 50 * allExercises.length,
                feedback: null
              };
              
              console.log('[시연 테스트] 시뮬레이션 세션 데이터:', simulatedSessionData);
              
              // completedSessionData에 저장
              setCompletedSessionData(simulatedSessionData);
              
              // 먼저 피드백 모달 표시
              setShowFeedbackModal(true);
              showFeedback(); // state를 'showing_feedback'로 변경
              
              console.log('[시연 테스트] 피드백 모달 표시, 상태 변경');
            }}
            style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px'
            }}
          >
            🎯 시연 테스트 (운동 완료 시뮬레이션)
          </button>
          <p style={{ fontSize: '10px', color: '#666', margin: '5px 0 0 0' }}>
            * 실제 운동 없이 완료 처리 (테스트용)
          </p>
        </div>
      </div>
    );
  }
  
  // 피드백 화면 (uiPhase로 체크) - showFeedbackModal로 이미 처리하므로 여기서는 스킵
  
  // 요약 화면 (uiPhase로 체크 - 백업용)
  if (uiPhase === 'summary' && completedSessionData) {
    return (
      <WorkoutSessionSummary
        summary={completedSessionData}
        onClose={() => window.location.href = '#/dashboard'}
        onNewWorkout={reset}
      />
    );
  }
  
  // 완료 화면 - 3초 후 자동으로 피드백 모달로 전환
  // (useEffect는 이미 453번 줄에서 처리됨)
  if (uiPhase === 'completed') {

    return (
      <div className="integrated-workout-completed">
        <div className="completion-content">
          <h1>🎉 수고하셨습니다!</h1>
          <p>훌륭한 운동이었어요!</p>
          <p className="auto-transition-message">잠시 후 피드백 화면으로 이동합니다...</p>
          <button onClick={() => {
            setShowFeedbackModal(true);
            showFeedback();
          }}>바로 피드백 남기기</button>
        </div>
      </div>
    );
  }
  
  return null;
};

export default IntegratedWorkoutSessionV2;