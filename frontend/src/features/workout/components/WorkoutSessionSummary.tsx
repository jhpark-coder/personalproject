import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { WorkoutProgram, ExerciseResult } from './IntegratedWorkoutSession';
import './WorkoutSessionSummary.css';

// Import SessionSummary interface from IntegratedWorkoutSession
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

interface WorkoutSessionSummaryProps {
  summary: SessionSummary;
  onClose: () => void;
  onNewWorkout: () => void;
}

interface SessionStats {
  totalExercises: number;
  completedExercises: number;
  totalSets: number;
  completedSets: number;
  averageAccuracy: number;
  bestExercise: string;
  improvementAreas: string[];
}

const WorkoutSessionSummary: React.FC<WorkoutSessionSummaryProps> = ({
  summary,
  onClose,
  onNewWorkout
}) => {
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);

  // 세션 통계 계산
  useEffect(() => {
    const calculateStats = () => {
      const totalExercises = summary.totalExercises;
      const completedExercises = summary.exerciseResults.length;
      const totalSets = summary.totalSets;
      const completedSets = summary.exerciseResults.reduce((sum, result) => sum + result.completedSets, 0);
      
      const averageAccuracy = summary.averageFormScore;

      // 최고 수행 운동 찾기
      const bestExercise = summary.exerciseResults.reduce((best, current) => {
        const bestScore = (best.averageFormScore || 0) * (best.completedSets / (best.targetSets || 1));
        const currentScore = (current.averageFormScore || 0) * (current.completedSets / (current.targetSets || 1));
        return currentScore > bestScore ? current : best;
      }, summary.exerciseResults[0])?.exerciseType || '';

      // 개선 필요 영역 식별 - use improvements from summary
      const improvementAreas = summary.improvements;

      setSessionStats({
        totalExercises,
        completedExercises,
        totalSets,
        completedSets,
        averageAccuracy,
        bestExercise,
        improvementAreas
      });
    };

    calculateStats();
  }, [summary]);

  // 운동 타입을 한글 이름으로 변환
  const getExerciseDisplayName = (exerciseType: string): string => {
    const displayNames: { [key: string]: string } = {
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

  // 시간 포맷팅 (MM:SS)
  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}분 ${remainingSeconds}초`;
  };

  // 세션 저장 (이미 IntegratedWorkoutSession에서 처리됨)
  const handleSaveSession = async () => {
    setIsSaving(true);
    try {
      // Session already saved in IntegratedWorkoutSession
      setIsSaved(true);
    } catch (error) {
      console.error('세션 저장 실패:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // 완주율 계산
  const completionRate = sessionStats ? 
    Math.round((sessionStats.completedSets / sessionStats.totalSets) * 100) : 0;

  // 성과 등급 계산
  const getPerformanceGrade = (): { grade: string; color: string; message: string } => {
    if (!sessionStats) return { grade: 'C', color: '#6c757d', message: '기본 수준' };
    
    const score = (completionRate * 0.6) + (sessionStats.averageAccuracy * 0.4);
    
    if (score >= 90) return { grade: 'S', color: '#28a745', message: '완벽한 수행!' };
    if (score >= 80) return { grade: 'A', color: '#17a2b8', message: '우수한 수행!' };
    if (score >= 70) return { grade: 'B', color: '#007AFF', message: '좋은 수행!' };
    if (score >= 60) return { grade: 'C', color: '#fd7e14', message: '보통 수행' };
    return { grade: 'D', color: '#dc3545', message: '더 노력해요!' };
  };

  const performance = getPerformanceGrade();

  return (
    <div className="workout-summary">
      <div className="summary-content">
        {/* 헤더 */}
        <div className="summary-header">
          <div className="performance-grade" style={{ backgroundColor: performance.color }}>
            {performance.grade}
          </div>
          <h1 className="summary-title">운동 완료!</h1>
          <p className="summary-subtitle">{performance.message}</p>
        </div>

        {/* 주요 통계 */}
        <div className="summary-stats-main">
          <div className="stat-card stat-card-primary">
            <div className="stat-icon">⏱️</div>
            <div className="stat-info">
              <div className="stat-value">{formatDuration(summary.totalDuration)}</div>
              <div className="stat-label">운동 시간</div>
            </div>
          </div>
          
          <div className="stat-card stat-card-secondary">
            <div className="stat-icon">🔥</div>
            <div className="stat-info">
              <div className="stat-value">{summary.caloriesBurned}kcal</div>
              <div className="stat-label">소모 칼로리</div>
            </div>
          </div>
        </div>

        {/* 세부 통계 */}
        {sessionStats && (
          <div className="summary-details">
            <h3 className="details-title">세부 결과</h3>
            
            <div className="progress-stats">
              <div className="progress-item">
                <div className="progress-header">
                  <span className="progress-label">완주율</span>
                  <span className="progress-value">{completionRate}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="progress-item">
                <div className="progress-header">
                  <span className="progress-label">평균 정확도</span>
                  <span className="progress-value">{Math.round(sessionStats.averageAccuracy)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${sessionStats.averageAccuracy}%` }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-item-label">완료한 운동</span>
                <span className="summary-item-value">
                  {sessionStats.completedExercises} / {sessionStats.totalExercises}개
                </span>
              </div>
              
              <div className="summary-item">
                <span className="summary-item-label">완료한 세트</span>
                <span className="summary-item-value">
                  {sessionStats.completedSets} / {sessionStats.totalSets}세트
                </span>
              </div>
              
              {sessionStats.bestExercise && (
                <div className="summary-item">
                  <span className="summary-item-label">최고 수행 운동</span>
                  <span className="summary-item-value">
                    {getExerciseDisplayName(sessionStats.bestExercise)}
                  </span>
                </div>
              )}
            </div>

            {/* 개선 제안 */}
            {sessionStats.improvementAreas.length > 0 && (
              <div className="improvement-suggestions">
                <h4 className="suggestions-title">💡 개선 제안</h4>
                <ul className="suggestions-list">
                  {sessionStats.improvementAreas.slice(0, 3).map((area, index) => (
                    <li key={index} className="suggestion-item">{area}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* 운동 결과 리스트 */}
        <div className="exercise-results">
          <h3 className="results-title">운동별 결과</h3>
          <div className="results-list">
            {summary.exerciseResults.map((result, index) => (
              <div key={index} className="result-item">
                <div className="result-info">
                  <span className="result-exercise">{getExerciseDisplayName(result.exerciseType)}</span>
                  <span className="result-sets">{result.completedSets}/{result.targetSets} 세트</span>
                </div>
                <div className="result-accuracy">
                  <span className="accuracy-value">{Math.round(result.averageFormScore || 0)}%</span>
                  <div className="accuracy-bar">
                    <div 
                      className="accuracy-fill"
                      style={{ width: `${result.averageFormScore || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="summary-actions">
          <button
            className={`summary-button summary-button-primary ${isSaved ? 'saved' : ''}`}
            onClick={handleSaveSession}
            disabled={isSaving || isSaved}
          >
            {isSaving ? '저장 중...' : isSaved ? '✅ 저장 완료' : '💾 운동 기록 저장'}
          </button>
          
          <div className="action-buttons">
            <button
              className="summary-button summary-button-secondary"
              onClick={onClose}
            >
              📊 대시보드로 가기
            </button>
            
            <button
              className="summary-button summary-button-outline"
              onClick={onNewWorkout}
            >
              🔄 다시 운동하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutSessionSummary;