import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@hooks/useAuth';
import { apiClient, API_ENDPOINTS } from '@config/api';
import MotionCoach from './MotionCoach';
import './IntegratedWorkoutSession.css';

interface WorkoutRecommendation {
  userProfile: {
    goal: string;
    experience: string;
    fitnessLevel: string;
    adaptationInfo: string;
    confidenceScore: string;
  };
  workoutPlan: {
    warmup: {
      name: string;
      exercises: any[];
      duration: number;
    };
    main: {
      name: string;
      exercises: any[];
      duration: number;
    };
    cooldown: {
      name: string;
      exercises: any[];
      duration: number;
    };
  };
  estimatedCalories: number;
  totalDuration: number;
  recommendations: string[];
  adaptationInfo: {
    adaptationFactor: number;
    confidenceLevel: string;
    recommendationType: string;
    learningStatus: string;
  };
}

interface IntegratedWorkoutSessionProps {
  onSessionComplete?: (sessionData: any) => void;
}

const IntegratedWorkoutSession: React.FC<IntegratedWorkoutSessionProps> = ({ onSessionComplete }) => {
  const { user } = useAuth();
  const [sessionPhase, setSessionPhase] = useState<'loading' | 'recommendations' | 'exercise-selection' | 'motion-coach' | 'completed'>('loading');
  const [workoutRecommendation, setWorkoutRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 1단계: 적응형 운동 추천 가져오기
   */
  const fetchWorkoutRecommendations = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post('/api/adaptive-workout/generate', {
        goal: user.goal || 'fitness',
        targetDuration: 45
      });

      if (response.data.success) {
        setWorkoutRecommendation(response.data.data);
        setSessionPhase('recommendations');
      } else {
        setError('운동 추천을 가져오는데 실패했습니다.');
      }
    } catch (error: any) {
      console.error('추천 가져오기 실패:', error);
      setError('운동 추천 서비스에 문제가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  /**
   * 2단계: 운동 선택
   */
  const selectExercise = useCallback((exercise: any) => {
    setSelectedExercise(exercise);
    setSessionPhase('motion-coach');
  }, []);

  /**
   * 3단계: MotionCoach 세션 완료 처리
   */
  const handleMotionCoachComplete = useCallback((motionCoachSessionData: any) => {
    setSessionData(motionCoachSessionData);
    setSessionPhase('completed');
    
    if (onSessionComplete) {
      onSessionComplete({
        ...motionCoachSessionData,
        recommendationData: workoutRecommendation,
        selectedExercise: selectedExercise
      });
    }
  }, [workoutRecommendation, selectedExercise, onSessionComplete]);

  /**
   * 새로운 운동 세션 시작
   */
  const startNewSession = useCallback(() => {
    setSessionPhase('loading');
    setWorkoutRecommendation(null);
    setSelectedExercise(null);
    setSessionData(null);
    setError(null);
    fetchWorkoutRecommendations();
  }, [fetchWorkoutRecommendations]);

  // 컴포넌트 마운트 시 추천 가져오기
  useEffect(() => {
    if (user && sessionPhase === 'loading') {
      fetchWorkoutRecommendations();
    }
  }, [user, sessionPhase, fetchWorkoutRecommendations]);

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

  // 1단계: 운동 추천 표시
  if (sessionPhase === 'recommendations' && workoutRecommendation) {
    return (
      <div className="integrated-workout-recommendations">
        <div className="recommendations-header">
          <h1>🎯 맞춤 운동 추천</h1>
          <div className="user-profile-summary">
            <div className="profile-item">
              <span className="label">목표:</span>
              <span className="value">{workoutRecommendation.userProfile.goal}</span>
            </div>
            <div className="profile-item">
              <span className="label">경험:</span>
              <span className="value">{workoutRecommendation.userProfile.experience}</span>
            </div>
            <div className="profile-item">
              <span className="label">피트니스 레벨:</span>
              <span className="value">{workoutRecommendation.userProfile.fitnessLevel}</span>
            </div>
            <div className="profile-item">
              <span className="label">추천 신뢰도:</span>
              <span className="value confidence">{workoutRecommendation.userProfile.confidenceScore}</span>
            </div>
          </div>
        </div>

        <div className="workout-plan">
          <div className="plan-overview">
            <div className="overview-item">
              <span className="icon">⏱️</span>
              <span className="text">총 {workoutRecommendation.totalDuration}분</span>
            </div>
            <div className="overview-item">
              <span className="icon">🔥</span>
              <span className="text">약 {workoutRecommendation.estimatedCalories} kcal</span>
            </div>
            <div className="overview-item">
              <span className="icon">🤖</span>
              <span className="text">{workoutRecommendation.adaptationInfo.recommendationType}</span>
            </div>
          </div>

          <div className="exercise-selection">
            <h3>💪 AI 추천 운동 (모션 코치 지원)</h3>
            <div className="exercise-grid">
              {workoutRecommendation.workoutPlan.main.exercises
                .filter(exercise => exercise.hasAICoaching)
                .map((exercise, index) => (
                <div key={index} className="exercise-card" onClick={() => selectExercise(exercise)}>
                  <div className="exercise-header">
                    <h4>{exercise.name}</h4>
                    <span className="ai-badge">🤖 AI 코칭</span>
                  </div>
                  <div className="exercise-details">
                    <div className="detail">
                      <span className="label">타겟:</span>
                      <span className="value">{exercise.target}</span>
                    </div>
                    <div className="detail">
                      <span className="label">세트:</span>
                      <span className="value">{exercise.sets}세트</span>
                    </div>
                    <div className="detail">
                      <span className="label">횟수:</span>
                      <span className="value">{exercise.reps}회</span>
                    </div>
                    <div className="detail">
                      <span className="label">적응 점수:</span>
                      <span className="value adaptation-score">
                        {(exercise.adaptationScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {exercise.personalizedTip && (
                    <div className="personalized-tip">
                      💡 {exercise.personalizedTip}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="recommendations-section">
            <h3>💡 개인화된 팁</h3>
            <div className="recommendations-list">
              {workoutRecommendation.recommendations.map((tip, index) => (
                <div key={index} className="recommendation-item">
                  {tip}
                </div>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button onClick={startNewSession} className="secondary-button">
              새로운 추천 받기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2단계: MotionCoach 실행
  if (sessionPhase === 'motion-coach' && selectedExercise) {
    return (
      <div className="integrated-workout-motion-coach">
        <div className="motion-coach-header">
          <h2>🤖 모션 코치: {selectedExercise.name}</h2>
          <div className="exercise-info">
            <span>{selectedExercise.sets}세트 × {selectedExercise.reps}회</span>
            <span>타겟: {selectedExercise.target}</span>
          </div>
          <button 
            onClick={() => setSessionPhase('exercise-selection')} 
            className="back-button"
          >
            ← 운동 선택으로 돌아가기
          </button>
        </div>
        
        <div className="motion-coach-wrapper">
          <MotionCoach 
            exerciseType={selectedExercise.name.toLowerCase().replace(/ /g, '_')}
            onSessionComplete={handleMotionCoachComplete}
          />
        </div>
      </div>
    );
  }

  // 3단계: 세션 완료
  if (sessionPhase === 'completed' && sessionData) {
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
              <span className="label">운동:</span>
              <span className="value">{selectedExercise?.name}</span>
            </div>
            <div className="summary-item">
              <span className="icon">🔢</span>
              <span className="label">총 횟수:</span>
              <span className="value">{sessionData.totalReps}회</span>
            </div>
            <div className="summary-item">
              <span className="icon">⏱️</span>
              <span className="label">소요 시간:</span>
              <span className="value">{Math.floor(sessionData.duration / 60)}분 {sessionData.duration % 60}초</span>
            </div>
            <div className="summary-item">
              <span className="icon">🔥</span>
              <span className="label">소모 칼로리:</span>
              <span className="value">{sessionData.caloriesBurned} kcal</span>
            </div>
            <div className="summary-item">
              <span className="icon">🎯</span>
              <span className="label">평균 정확도:</span>
              <span className="value">{(sessionData.averageFormScore * 100).toFixed(1)}%</span>
            </div>
            <div className="summary-item">
              <span className="icon">💡</span>
              <span className="label">자세 교정:</span>
              <span className="value">{sessionData.formCorrectionsCount}회</span>
            </div>
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