import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '@config/api';
import { apiClient } from '@utils/axiosConfig';
import { getUserData } from '@utils/userProfile';
import WorkoutFeedback from './WorkoutFeedback';
import './WorkoutRecommendation.css';

interface Exercise {
  name: string;
  target: string;
  sets: number;
  reps: number;
  restSeconds: number;
  mets: number;
  hasAICoaching: boolean;
  adaptationScore?: number;
  personalizedTip?: string;
}

interface WorkoutPhase {
  name: string;
  exercises: Exercise[];
  duration: number;
}

interface UserProfile {
  goal: string;
  experience: string;
  bmi?: number;
  bmiCategory?: string;
  fitnessLevel: string;
  progressTrend?: string;
  motivationLevel?: string;
  adaptationInfo?: string;
  confidenceScore?: string;
}

interface WorkoutRecommendation {
  userProfile: UserProfile;
  workoutPlan: {
    warmup: WorkoutPhase;
    main: WorkoutPhase;
    cooldown: WorkoutPhase;
  };
  estimatedCalories: number;
  totalDuration: number;
  recommendations: string[];
  type?: string; // 'adaptive' or 'template'
  info?: string;
  learningLevel?: string;
  adaptationInfo?: any;
  feedbackInsights?: {
    recentSatisfaction?: string;
    difficultyTrend?: string;
    completionTrend?: string;
    motivationLevel?: string;
    bestPerformingExercise?: string;
    message?: string;
  };
}

const WorkoutRecommendation: React.FC = () => {
  const [recommendation, setRecommendation] = useState<WorkoutRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [workoutInProgress, setWorkoutInProgress] = useState(false);

  const goalLabels: { [key: string]: string } = {
    diet: '다이어트 성공하기',
    strength: '스트렝스 근력 키우기',
    body: '탄탄한 몸 만들기',
    fitness: '신체 능력 향상시키기',
    stamina: '체력 키우기'
  };

  const experienceLabels: { [key: string]: string } = {
    beginner: '초보자',
    intermediate: '중급자',  
    advanced: '고급자'
  };

  const fetchRecommendation = async () => {
    setLoading(true);
    setError(null);

    try {
      // 백엔드에서 사용자 프로필 가져오기 (우선순위: 백엔드 > localStorage > 기본값)
      const userData = await getUserData();
      
      console.log('🎯 WorkoutRecommendation - 사용자 데이터:', userData);

      const response = await apiClient.post('/api/workout/recommend', userData);

      if (response.data.success) {
        setRecommendation(response.data.data);
        console.log('✅ WorkoutRecommendation - 추천 운동 로드 완료:', response.data.data);
      } else {
        setError(response.data.message || '운동 추천을 가져올 수 없습니다.');
      }
    } catch (err) {
      console.error('운동 추천 오류:', err);
      setError('운동 추천을 가져오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const startWorkoutSession = async () => {
    if (!recommendation) return;

    try {
      const response = await apiClient.post('/api/adaptive-workout/start-session', {
        goal: recommendation.userProfile.goal,
        plannedDuration: recommendation.totalDuration
      });

      if (response.data.success) {
        setCurrentSessionId(response.data.sessionId);
        setWorkoutInProgress(true);
        alert('운동을 시작합니다! 운동 후 피드백을 남겨주세요. 💪');
      }
    } catch (err: any) {
      console.error('세션 시작 오류:', err);
      // 세션 시작 실패 시에도 운동은 가능하도록
      setWorkoutInProgress(true);
      alert('운동을 시작합니다! (피드백 기능은 로그인 후 사용 가능합니다)');
    }
  };

  const completeWorkout = () => {
    if (currentSessionId) {
      setShowFeedback(true);
    } else {
      // 세션 ID가 없는 경우 (비로그인 사용자)
      alert('운동 완료! 더 정확한 추천을 위해 회원가입 후 피드백을 남겨보세요. 😊');
      setWorkoutInProgress(false);
    }
  };

  const handleFeedbackComplete = () => {
    setShowFeedback(false);
    setWorkoutInProgress(false);
    setCurrentSessionId(null);
    
    // 새로운 추천 가져오기
    setTimeout(() => {
      fetchRecommendation();
    }, 1000);
  };

  useEffect(() => {
    fetchRecommendation();
  }, []);

  const renderExercise = (exercise: Exercise, index: number) => (
    <div key={index} className="exercise-item">
      <div className="exercise-header">
        <h4 className="exercise-name">
          {exercise.name}
          {exercise.hasAICoaching && <span className="ai-badge">🤖 AI 코칭</span>}
        </h4>
        <span className="exercise-target">{exercise.target}</span>
      </div>
      
      <div className="exercise-details">
        <div className="exercise-stat">
          <span className="stat-label">세트</span>
          <span className="stat-value">{exercise.sets}세트</span>
        </div>
        <div className="exercise-stat">
          <span className="stat-label">횟수</span>
          <span className="stat-value">{exercise.reps}회</span>
        </div>
        <div className="exercise-stat">
          <span className="stat-label">휴식</span>
          <span className="stat-value">{exercise.restSeconds}초</span>
        </div>
        <div className="exercise-stat">
          <span className="stat-label">강도</span>
          <span className="stat-value">{exercise.mets} MET</span>
        </div>
      </div>

      {/* 개인화 팁 표시 */}
      {exercise.personalizedTip && (
        <div className="exercise-tip">
          💡 {exercise.personalizedTip}
        </div>
      )}
    </div>
  );

  const renderWorkoutPhase = (phase: WorkoutPhase) => (
    <div className="workout-phase">
      <div className="phase-header">
        <h3 className="phase-name">{phase.name}</h3>
        <span className="phase-duration">{phase.duration}분</span>
      </div>
      <div className="exercises-list">
        {phase.exercises.map((exercise, index) => renderExercise(exercise, index))}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="workout-recommendation-container">
        <div className="loading-spinner"></div>
        <p>맞춤 운동을 추천하고 있습니다...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="workout-recommendation-container">
        <div className="error-message">
          <h3>오류가 발생했습니다</h3>
          <p>{error}</p>
          <button onClick={fetchRecommendation} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return <div className="workout-recommendation-container">추천 데이터가 없습니다.</div>;
  }

  return (
    <div className="workout-recommendation-container">
      {/* 추천 타입 표시 */}
      {recommendation.type === 'adaptive' && (
        <div className="adaptive-badge">
          ✨ 개인화된 적응형 추천
          {recommendation.learningLevel && (
            <small>({recommendation.learningLevel})</small>
          )}
        </div>
      )}

      <div className="recommendation-header">
        <h1>맞춤 운동 추천</h1>
        
        {/* 추천 정보 표시 */}
        {recommendation.info && (
          <div className="recommendation-info">
            💡 {recommendation.info}
          </div>
        )}

        <div className="user-profile">
          <div className="profile-item">
            <span className="profile-label">목표:</span>
            <span className="profile-value">{goalLabels[recommendation.userProfile.goal]}</span>
          </div>
          <div className="profile-item">
            <span className="profile-label">경험:</span>
            <span className="profile-value">{experienceLabels[recommendation.userProfile.experience]}</span>
          </div>
          {recommendation.userProfile.bmi && (
            <div className="profile-item">
              <span className="profile-label">BMI:</span>
              <span className="profile-value">{recommendation.userProfile.bmi} ({recommendation.userProfile.bmiCategory})</span>
            </div>
          )}
          <div className="profile-item">
            <span className="profile-label">체력 수준:</span>
            <span className="profile-value">{recommendation.userProfile.fitnessLevel}</span>
          </div>
          
          {/* 적응형 추가 정보 */}
          {recommendation.userProfile.progressTrend && (
            <div className="profile-item">
              <span className="profile-label">진행 추세:</span>
              <span className="profile-value">{recommendation.userProfile.progressTrend}</span>
            </div>
          )}
          {recommendation.userProfile.confidenceScore && (
            <div className="profile-item">
              <span className="profile-label">학습도:</span>
              <span className="profile-value">{recommendation.userProfile.confidenceScore}</span>
            </div>
          )}
        </div>
      </div>

      <div className="workout-summary">
        <div className="summary-item">
          <div className="summary-icon">⏱️</div>
          <div className="summary-text">
            <span className="summary-label">총 시간</span>
            <span className="summary-value">{recommendation.totalDuration}분</span>
          </div>
        </div>
        <div className="summary-item">
          <div className="summary-icon">🔥</div>
          <div className="summary-text">
            <span className="summary-label">예상 칼로리</span>
            <span className="summary-value">{recommendation.estimatedCalories}kcal</span>
          </div>
        </div>
      </div>

      <div className="workout-plan">
        {renderWorkoutPhase(recommendation.workoutPlan.warmup)}
        {renderWorkoutPhase(recommendation.workoutPlan.main)}
        {renderWorkoutPhase(recommendation.workoutPlan.cooldown)}
      </div>

      {/* 피드백 기반 인사이트 섹션 */}
      {recommendation.feedbackInsights && (
        <div className="feedback-insights">
          <h3>📊 최근 운동 분석</h3>
          {recommendation.feedbackInsights.message ? (
            <p className="insights-message">{recommendation.feedbackInsights.message}</p>
          ) : (
            <div className="insights-grid">
              {recommendation.feedbackInsights.recentSatisfaction && (
                <div className="insight-item">
                  <span className="insight-label">만족도</span>
                  <span className="insight-value">{recommendation.feedbackInsights.recentSatisfaction}</span>
                </div>
              )}
              {recommendation.feedbackInsights.difficultyTrend && (
                <div className="insight-item">
                  <span className="insight-label">난이도</span>
                  <span className="insight-value">{recommendation.feedbackInsights.difficultyTrend}</span>
                </div>
              )}
              {recommendation.feedbackInsights.completionTrend && (
                <div className="insight-item">
                  <span className="insight-label">완주율</span>
                  <span className="insight-value">{recommendation.feedbackInsights.completionTrend}</span>
                </div>
              )}
              {recommendation.feedbackInsights.motivationLevel && (
                <div className="insight-item">
                  <span className="insight-label">동기</span>
                  <span className="insight-value">{recommendation.feedbackInsights.motivationLevel}</span>
                </div>
              )}
              {recommendation.feedbackInsights.bestPerformingExercise && (
                <div className="insight-item">
                  <span className="insight-label">베스트 운동</span>
                  <span className="insight-value">{recommendation.feedbackInsights.bestPerformingExercise}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="recommendations">
        <h3>💡 맞춤 조언</h3>
        <ul className="tips-list">
          {recommendation.recommendations.map((tip, index) => (
            <li key={index} className="tip-item">{tip}</li>
          ))}
        </ul>
      </div>

      <div className="action-buttons">
        <button onClick={fetchRecommendation} className="refresh-button">
          새로운 추천 받기
        </button>
        
        {!workoutInProgress ? (
          <button onClick={startWorkoutSession} className="start-workout-button">
            운동 시작하기
          </button>
        ) : (
          <button onClick={completeWorkout} className="complete-workout-button">
            운동 완료하기
          </button>
        )}
      </div>

      {/* 피드백 모달 */}
      {showFeedback && currentSessionId && recommendation && (
        <WorkoutFeedback
          sessionId={currentSessionId}
          exercises={recommendation.workoutPlan.main.exercises.map(ex => ({
            name: ex.name,
            plannedSets: ex.sets,
            plannedReps: ex.reps,
            plannedDuration: ex.reps * 2 // 대략적인 시간 계산
          }))}
          onComplete={handleFeedbackComplete}
          onClose={() => setShowFeedback(false)}
        />
      )}
    </div>
  );
};

export default WorkoutRecommendation;