import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { WorkoutProgram, WorkoutExercise, ExerciseType } from './WorkoutProgramSelector';
import MotionCoach from './MotionCoach';
import WorkoutProgramSelector from './WorkoutProgramSelector';
import RestTimer from './RestTimer';
import WorkoutSessionSummary from './WorkoutSessionSummary';
import { apiClient } from '@utils/axiosConfig';
import './IntegratedWorkoutSession.css';

interface ExerciseResult {
  exerciseType: ExerciseType;
  completedSets: number;
  targetSets: number;
  completedReps: number;
  targetReps: number;
  averageFormScore: number;
  formCorrections: string[];
  duration: number; // 실제 소요시간 (초)
}

interface SessionSummary {
  totalDuration: number;
  totalExercises: number;
  totalSets: number;
  totalReps: number;
  caloriesBurned: number;
  averageFormScore: number;
  improvements: string[];
  nextRecommendations: string[];
  exerciseResults: ExerciseResult[];
}

type SessionPhase = 'program_selection' | 'warmup' | 'exercise_active' | 'exercise_rest' | 
                   'exercise_complete' | 'session_complete' | 'summary';

interface WorkoutSessionState {
  selectedProgram: WorkoutProgram | null;
  currentPhase: SessionPhase;
  currentExerciseIndex: number;
  currentSet: number;
  sessionStartTime: Date | null;
  exerciseStartTime: Date | null;
  exerciseResults: ExerciseResult[];
  currentExerciseResult: Partial<ExerciseResult>;
}

const IntegratedWorkoutSession: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 라우터 state에서 선택된 프로그램 가져오기
  const initialProgram = location.state?.selectedProgram as WorkoutProgram | undefined;

  const [sessionState, setSessionState] = useState<WorkoutSessionState>({
    selectedProgram: initialProgram || null,
    currentPhase: initialProgram ? 'warmup' : 'program_selection',
    currentExerciseIndex: 0,
    currentSet: 1,
    sessionStartTime: null,
    exerciseStartTime: null,
    exerciseResults: [],
    currentExerciseResult: {}
  });

  const [restTimeLeft, setRestTimeLeft] = useState(0);
  const [sessionSummary, setSesssionSummary] = useState<SessionSummary | null>(null);
  const [showProgramSelector, setShowProgramSelector] = useState(!initialProgram);
  
  // TTS 피드백을 위한 ref
  const lastAnnouncementRef = useRef<string>('');

  // 현재 운동 정보 계산
  const currentExercise = sessionState.selectedProgram?.exercises[sessionState.currentExerciseIndex];
  const totalExercises = sessionState.selectedProgram?.exercises.length || 0;
  const isLastExercise = sessionState.currentExerciseIndex >= totalExercises - 1;
  const isLastSet = currentExercise && sessionState.currentSet >= currentExercise.targetSets;

  // 프로그램 선택 처리
  const handleProgramSelect = useCallback((program: WorkoutProgram) => {
    setSessionState(prev => ({
      ...prev,
      selectedProgram: program,
      currentPhase: 'warmup',
      sessionStartTime: new Date(),
      currentExerciseIndex: 0,
      currentSet: 1,
      exerciseResults: [],
      currentExerciseResult: {
        exerciseType: program.exercises[0]?.exerciseType,
        completedSets: 0,
        targetSets: program.exercises[0]?.targetSets || 0,
        completedReps: 0,
        targetReps: program.exercises[0]?.targetReps || 0,
        averageFormScore: 0,
        formCorrections: [],
        duration: 0
      }
    }));
    setShowProgramSelector(false);
    
    // TTS 안내
    playTTSFeedback(`${program.title} 프로그램을 시작합니다! 준비되셨나요?`);
  }, []);

  // TTS 피드백 재생 (중복 방지)
  const playTTSFeedback = useCallback((message: string) => {
    if (lastAnnouncementRef.current === message) return;
    
    lastAnnouncementRef.current = message;
    
    // TTS 재생 로직 (MotionCoach의 TTS 서비스 활용)
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(message);
      utterance.lang = 'ko-KR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // 워밍업 완료 → 첫 번째 운동 시작
  const handleWarmupComplete = useCallback(() => {
    if (!currentExercise) return;
    
    setSessionState(prev => ({
      ...prev,
      currentPhase: 'exercise_active',
      exerciseStartTime: new Date()
    }));
    
    playTTSFeedback(`첫 번째 운동, ${getExerciseDisplayName(currentExercise.exerciseType)}을 시작합니다!`);
  }, [currentExercise]);

  // 세트 완료 처리
  const handleSetComplete = useCallback((repsCompleted: number, formScore: number, corrections: string[]) => {
    if (!currentExercise) return;
    
    const now = new Date();
    const exerciseStartTime = sessionState.exerciseStartTime || now;
    const setDuration = Math.floor((now.getTime() - exerciseStartTime.getTime()) / 1000);
    
    // 현재 운동 결과 업데이트
    setSessionState(prev => ({
      ...prev,
      currentExerciseResult: {
        ...prev.currentExerciseResult,
        completedSets: sessionState.currentSet,
        completedReps: (prev.currentExerciseResult.completedReps || 0) + repsCompleted,
        averageFormScore: formScore,
        formCorrections: [...(prev.currentExerciseResult.formCorrections || []), ...corrections],
        duration: (prev.currentExerciseResult.duration || 0) + setDuration
      }
    }));

    if (sessionState.currentSet < currentExercise.targetSets) {
      // 다음 세트로 → 휴식 시간
      setRestTimeLeft(currentExercise.restSeconds);
      setSessionState(prev => ({ ...prev, currentPhase: 'exercise_rest' }));
      
      playTTSFeedback(`${sessionState.currentSet}세트 완료! ${currentExercise.restSeconds}초 휴식합니다.`);
    } else {
      // 운동 완료 → 다음 운동 또는 세션 완료
      handleExerciseComplete();
    }
  }, [currentExercise, sessionState.currentSet, sessionState.exerciseStartTime]);

  // 운동 완료 처리
  const handleExerciseComplete = useCallback(() => {
    if (!currentExercise) return;

    // 운동 결과를 exerciseResults에 추가
    setSessionState(prev => {
      const completedResult: ExerciseResult = {
        exerciseType: currentExercise.exerciseType,
        completedSets: prev.currentExerciseResult.completedSets || 0,
        targetSets: currentExercise.targetSets,
        completedReps: prev.currentExerciseResult.completedReps || 0,
        targetReps: currentExercise.targetReps * currentExercise.targetSets,
        averageFormScore: prev.currentExerciseResult.averageFormScore || 0,
        formCorrections: prev.currentExerciseResult.formCorrections || [],
        duration: prev.currentExerciseResult.duration || 0
      };

      if (isLastExercise) {
        // 전체 세션 완료
        return {
          ...prev,
          currentPhase: 'session_complete',
          exerciseResults: [...prev.exerciseResults, completedResult]
        };
      } else {
        // 다음 운동으로
        const nextExercise = prev.selectedProgram!.exercises[prev.currentExerciseIndex + 1];
        return {
          ...prev,
          currentPhase: 'exercise_active',
          currentExerciseIndex: prev.currentExerciseIndex + 1,
          currentSet: 1,
          exerciseStartTime: new Date(),
          exerciseResults: [...prev.exerciseResults, completedResult],
          currentExerciseResult: {
            exerciseType: nextExercise.exerciseType,
            completedSets: 0,
            targetSets: nextExercise.targetSets,
            completedReps: 0,
            targetReps: nextExercise.targetReps,
            averageFormScore: 0,
            formCorrections: [],
            duration: 0
          }
        };
      }
    });

    if (!isLastExercise) {
      const nextExercise = sessionState.selectedProgram!.exercises[sessionState.currentExerciseIndex + 1];
      playTTSFeedback(`다음 운동! ${getExerciseDisplayName(nextExercise.exerciseType)}을 시작합니다!`);
    } else {
      playTTSFeedback('모든 운동을 완료했습니다! 수고하셨어요!');
    }
  }, [currentExercise, isLastExercise, sessionState.selectedProgram, sessionState.currentExerciseIndex]);

  // 휴식 완료 → 다음 세트 시작
  const handleRestComplete = useCallback(() => {
    setSessionState(prev => ({
      ...prev,
      currentPhase: 'exercise_active',
      currentSet: prev.currentSet + 1,
      exerciseStartTime: new Date()
    }));
    
    playTTSFeedback(`${sessionState.currentSet + 1}세트 시작합니다!`);
  }, [sessionState.currentSet]);

  // 세션 완료 → 결과 분석
  useEffect(() => {
    if (sessionState.currentPhase === 'session_complete') {
      generateSessionSummary();
    }
  }, [sessionState.currentPhase]);

  // 세션 결과 분석 생성
  const generateSessionSummary = useCallback(async () => {
    if (!sessionState.selectedProgram || !sessionState.sessionStartTime) return;

    const now = new Date();
    const totalDuration = Math.floor((now.getTime() - sessionState.sessionStartTime.getTime()) / 1000);
    
    const totalReps = sessionState.exerciseResults.reduce((sum, result) => sum + result.completedReps, 0);
    const totalSets = sessionState.exerciseResults.reduce((sum, result) => sum + result.completedSets, 0);
    const averageFormScore = sessionState.exerciseResults.length > 0 
      ? sessionState.exerciseResults.reduce((sum, result) => sum + result.averageFormScore, 0) / sessionState.exerciseResults.length
      : 0;

    // 칼로리 계산 (간단한 추정)
    const estimatedCalories = Math.round(totalDuration / 60 * 5 * (averageFormScore + 0.5)); // 대략적인 계산

    // 개선 포인트 생성
    const improvements: string[] = [];
    const allCorrections = sessionState.exerciseResults.flatMap(result => result.formCorrections);
    const uniqueCorrections = [...new Set(allCorrections)];
    if (uniqueCorrections.length > 0) {
      improvements.push(...uniqueCorrections.slice(0, 3));
    }
    if (averageFormScore < 0.7) {
      improvements.push('자세 정확도를 더 높여보세요');
    }

    const summary: SessionSummary = {
      totalDuration,
      totalExercises: sessionState.exerciseResults.length,
      totalSets,
      totalReps,
      caloriesBurned: estimatedCalories,
      averageFormScore,
      improvements,
      nextRecommendations: [
        '꾸준한 운동으로 체력을 더 키워보세요',
        '다음에는 강도를 조금 높여보는 것이 어떨까요?'
      ],
      exerciseResults: sessionState.exerciseResults
    };

    setSesssionSummary(summary);
    
    // 백엔드로 세션 결과 전송
    try {
      await sendSessionResultToBackend(summary);
    } catch (error) {
      console.error('세션 결과 전송 실패:', error);
    }

    // 요약 화면으로 전환
    setTimeout(() => {
      setSessionState(prev => ({ ...prev, currentPhase: 'summary' }));
    }, 1000);
  }, [sessionState.selectedProgram, sessionState.sessionStartTime, sessionState.exerciseResults]);

  // 백엔드로 세션 결과 전송
  const sendSessionResultToBackend = useCallback(async (summary: SessionSummary) => {
    if (!sessionState.selectedProgram || !sessionState.sessionStartTime) return;

    const sessionData = {
      programId: sessionState.selectedProgram.id,
      programTitle: sessionState.selectedProgram.title,
      startTime: sessionState.sessionStartTime.toISOString(),
      endTime: new Date().toISOString(),
      totalDuration: summary.totalDuration,
      totalReps: summary.totalReps,
      totalSets: summary.totalSets,
      averageFormScore: summary.averageFormScore,
      caloriesBurned: summary.caloriesBurned,
      exerciseResults: summary.exerciseResults,
      formCorrections: summary.improvements
    };

    const response = await apiClient.post('/api/workout/complete-integrated-session', sessionData);
    
    if (response.data.success) {
      console.log('세션 결과 전송 성공:', response.data.sessionId);
    }
  }, [sessionState.selectedProgram, sessionState.sessionStartTime]);

  // 운동 이름 한글 변환
  const getExerciseDisplayName = (exerciseType: ExerciseType): string => {
    const displayNames: { [key in ExerciseType]: string } = {
      squat: '스쿼트',
      lunge: '런지', 
      pushup: '푸시업',
      plank: '플랭크',
      calf_raise: '카프 레이즈',
      burpee: '버피',
      mountain_climber: '마운틴 클라이머'
    };
    return displayNames[exerciseType] || exerciseType;
  };

  // UI 렌더링
  if (showProgramSelector || sessionState.currentPhase === 'program_selection') {
    return (
      <WorkoutProgramSelector 
        onSelectProgram={handleProgramSelect}
        isModal={false}
      />
    );
  }

  if (sessionState.currentPhase === 'summary' && sessionSummary) {
    return (
      <WorkoutSessionSummary 
        summary={sessionSummary}
        onClose={() => navigate('/dashboard')}
        onNewWorkout={() => {
          setSessionState({
            selectedProgram: null,
            currentPhase: 'program_selection',
            currentExerciseIndex: 0,
            currentSet: 1,
            sessionStartTime: null,
            exerciseStartTime: null,
            exerciseResults: [],
            currentExerciseResult: {}
          });
          setShowProgramSelector(true);
          setSesssionSummary(null);
        }}
      />
    );
  }

  return (
    <div className="integrated-workout-session">
      {/* 상단 진행 표시 */}
      <div className="session-header">
        <div className="session-progress">
          <div className="progress-info">
            <h2>{sessionState.selectedProgram?.title}</h2>
            <p>
              {sessionState.currentPhase === 'warmup' 
                ? '워밍업' 
                : `${sessionState.currentExerciseIndex + 1}/${totalExercises} - ${getExerciseDisplayName(currentExercise?.exerciseType || 'squat')}`
              }
            </p>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: sessionState.currentPhase === 'warmup' 
                  ? '5%' 
                  : `${((sessionState.currentExerciseIndex + (sessionState.currentSet / (currentExercise?.targetSets || 1))) / totalExercises) * 100}%`
              }}
            />
          </div>
          
          {sessionState.currentPhase === 'exercise_active' && currentExercise && (
            <div className="current-exercise-info">
              <span>세트: {sessionState.currentSet}/{currentExercise.targetSets}</span>
              <span>목표: {currentExercise.targetReps}회</span>
            </div>
          )}
        </div>
        
        <button 
          className="exit-button"
          onClick={() => navigate('/dashboard')}
        >
          ✕
        </button>
      </div>

      {/* 메인 컨텐츠 영역 */}
      <div className="session-content">
        {sessionState.currentPhase === 'warmup' && (
          <div className="warmup-screen">
            <div className="warmup-content">
              <h1>🔥 준비 운동</h1>
              <p>본격적인 운동을 위해 몸을 풀어볼까요?</p>
              
              <div className="warmup-exercises">
                <div className="warmup-item">⭕ 목 돌리기 (10회)</div>
                <div className="warmup-item">⭕ 어깨 돌리기 (10회)</div>
                <div className="warmup-item">⭕ 팔 벌려 뛰기 (20회)</div>
                <div className="warmup-item">⭕ 무릎 높이 뛰기 (10회)</div>
              </div>
              
              <button 
                className="warmup-complete-button"
                onClick={handleWarmupComplete}
              >
                준비운동 완료, 시작하기!
              </button>
            </div>
          </div>
        )}

        {sessionState.currentPhase === 'exercise_active' && currentExercise && (
          <MotionCoach
            exerciseType={currentExercise.exerciseType}
            targetSets={currentExercise.targetSets}
            targetReps={currentExercise.targetReps}
            currentSet={sessionState.currentSet}
            onSetComplete={handleSetComplete}
            autoMode={true}
          />
        )}

        {sessionState.currentPhase === 'exercise_rest' && currentExercise && (
          <RestTimer
            duration={restTimeLeft}
            onComplete={handleRestComplete}
            onSkip={handleRestComplete}
            nextExercise={
              sessionState.currentSet < currentExercise.targetSets 
                ? { name: getExerciseDisplayName(currentExercise.exerciseType), set: sessionState.currentSet + 1 }
                : { name: getExerciseDisplayName(sessionState.selectedProgram!.exercises[sessionState.currentExerciseIndex + 1]?.exerciseType || 'squat'), set: 1 }
            }
          />
        )}

        {sessionState.currentPhase === 'session_complete' && (
          <div className="completion-screen">
            <div className="completion-content">
              <h1>🎉 운동 완료!</h1>
              <p>모든 운동을 성공적으로 완료했습니다!</p>
              <div className="loading-spinner"></div>
              <p>운동 결과를 분석하고 있습니다...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntegratedWorkoutSession;