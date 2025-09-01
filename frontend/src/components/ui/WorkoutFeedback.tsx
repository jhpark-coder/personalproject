import React, { useState, useCallback } from 'react';
import { apiClient } from '../../utils/axiosConfig';
import './WorkoutFeedback.css';

interface Exercise {
  name: string;
  plannedSets: number;
  plannedReps: number;
  plannedDuration?: number;
}

interface ExerciseFeedback {
  exerciseName: string;
  plannedSets?: number;
  completedSets?: number;
  plannedReps?: number;
  completedReps?: number;
  plannedDuration?: number;
  actualDuration?: number;
  perceivedExertion?: number; // 1-10 RPE scale
}

interface SessionFeedback {
  completionRate: number; // 0.0-1.0
  overallDifficulty: number; // 1-5
  satisfaction: number; // 1-5
  energyAfter?: number; // 1-5
  muscleSoreness?: number; // 1-5
  wouldRepeat: boolean;
  comments?: string;
  exerciseFeedbacks: ExerciseFeedback[];
}

interface WorkoutFeedbackProps {
  sessionId: number;
  exercises: Exercise[];
  onComplete?: () => void;
  onClose?: () => void;
}

function WorkoutFeedback({ 
  sessionId, 
  exercises, 
  onComplete, 
  onClose 
}: WorkoutFeedbackProps) {
  const [feedback, setFeedback] = useState<SessionFeedback>({
    completionRate: 0.8,
    overallDifficulty: 3,
    satisfaction: 3,
    energyAfter: 3,
    muscleSoreness: 2,
    wouldRepeat: true,
    comments: '',
    exerciseFeedbacks: exercises.map(exercise => ({
      exerciseName: exercise.name,
      plannedSets: exercise.plannedSets,
      plannedReps: exercise.plannedReps,
      plannedDuration: exercise.plannedDuration,
      completedSets: exercise.plannedSets,
      completedReps: exercise.plannedReps,
      actualDuration: exercise.plannedDuration,
      perceivedExertion: 6
    }))
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 레이블 매핑
  const difficultyLabels = ['', '너무 쉬웠다', '쉬웠다', '적당했다', '어려웠다', '너무 어려웠다'];
  const satisfactionLabels = ['', '별로', '그저그럼', '보통', '만족', '매우 만족'];
  const energyLabels = ['', '완전 지침', '피곤함', '보통', '활기참', '에너지 충만'];
  const sorenessLabels = ['', '전혀 없음', '약간', '보통', '꽤 아픔', '심한 통증'];
  const rpeLabels = ['', '매우 가벼움', '가벼움', '', '조금 힘듦', '', '힘듦', '매우 힘듦', '', '극도로 힘듦', '최대 강도'];

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      await apiClient.post(`/api/adaptive-workout/sessions/${sessionId}/feedback`, feedback);
      
      if (onComplete) {
        onComplete();
      } else {
        alert('피드백이 저장되었습니다! 다음 운동 추천이 더욱 정확해집니다. 💪');
      }
      
    } catch (err: any) {
      console.error('피드백 저장 오류:', err);
      setError(err.response?.data?.message || '피드백 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const updateExerciseFeedback = (index: number, field: keyof ExerciseFeedback, value: any) => {
    const newExerciseFeedbacks = [...feedback.exerciseFeedbacks];
    newExerciseFeedbacks[index] = {
      ...newExerciseFeedbacks[index],
      [field]: value
    };
    setFeedback({
      ...feedback,
      exerciseFeedbacks: newExerciseFeedbacks
    });
  };

  // 전체 완료율 자동 계산
  const calculateOverallCompletionRate = useCallback(() => {
    const totalPlanned = feedback.exerciseFeedbacks.reduce((sum, ex) => 
      sum + (ex.plannedSets || 0) * (ex.plannedReps || 0), 0);
    const totalCompleted = feedback.exerciseFeedbacks.reduce((sum, ex) => 
      sum + (ex.completedSets || 0) * (ex.completedReps || 0), 0);
    
    return totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) / 100 : 0.8;
  }, [feedback.exerciseFeedbacks]);

  // 완료율 자동 업데이트
  React.useEffect(() => {
    const newCompletionRate = calculateOverallCompletionRate();
    setFeedback(prev => ({ ...prev, completionRate: newCompletionRate }));
  }, [calculateOverallCompletionRate]);

  return (
    <div className="workout-feedback-overlay">
      <div className="workout-feedback-container">
        <div className="feedback-header">
          <h2>운동 후 피드백</h2>
          <p>오늘 운동은 어떠셨나요? 솔직한 피드백을 남겨주시면 다음 운동이 더욱 정확하게 추천됩니다!</p>
          {onClose && (
            <button className="close-button" onClick={onClose} aria-label="닫기">
              ✕
            </button>
          )}
        </div>

        <div className="feedback-content">
          {/* 전체 세션 피드백 */}
          <section className="session-feedback">
            <h3>🎯 전체적인 평가</h3>
            
            <div className="feedback-row">
              <label>완료율: {Math.round(feedback.completionRate * 100)}%</label>
              <div className="completion-bar">
                <div 
                  className="completion-fill" 
                  style={{ width: `${feedback.completionRate * 100}%` }}
                />
              </div>
            </div>

            <div className="feedback-row">
              <label>전체적인 난이도</label>
              <div className="rating-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    className={`rating-button ${feedback.overallDifficulty === value ? 'active' : ''}`}
                    onClick={() => setFeedback({ ...feedback, overallDifficulty: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="rating-label">{difficultyLabels[feedback.overallDifficulty]}</span>
            </div>

            <div className="feedback-row">
              <label>만족도</label>
              <div className="rating-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    className={`rating-button ${feedback.satisfaction === value ? 'active' : ''}`}
                    onClick={() => setFeedback({ ...feedback, satisfaction: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="rating-label">{satisfactionLabels[feedback.satisfaction]}</span>
            </div>

            <div className="feedback-row">
              <label>운동 후 에너지 상태</label>
              <div className="rating-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    className={`rating-button ${feedback.energyAfter === value ? 'active' : ''}`}
                    onClick={() => setFeedback({ ...feedback, energyAfter: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="rating-label">{energyLabels[feedback.energyAfter || 3]}</span>
            </div>

            <div className="feedback-row">
              <label>근육통 정도</label>
              <div className="rating-group">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    className={`rating-button ${feedback.muscleSoreness === value ? 'active' : ''}`}
                    onClick={() => setFeedback({ ...feedback, muscleSoreness: value })}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <span className="rating-label">{sorenessLabels[feedback.muscleSoreness || 2]}</span>
            </div>

            <div className="feedback-row">
              <label>다시 하고 싶나요?</label>
              <div className="toggle-group">
                <button
                  className={`toggle-button ${feedback.wouldRepeat ? 'active' : ''}`}
                  onClick={() => setFeedback({ ...feedback, wouldRepeat: true })}
                >
                  네! 😊
                </button>
                <button
                  className={`toggle-button ${!feedback.wouldRepeat ? 'active' : ''}`}
                  onClick={() => setFeedback({ ...feedback, wouldRepeat: false })}
                >
                  아니오 😐
                </button>
              </div>
            </div>
          </section>

          {/* 개별 운동 피드백 */}
          <section className="exercise-feedback">
            <h3>💪 운동별 상세 피드백</h3>
            
            {feedback.exerciseFeedbacks.map((exercise, index) => (
              <div key={index} className="exercise-feedback-item">
                <h4>{exercise.exerciseName}</h4>
                
                <div className="exercise-stats">
                  <div className="stat-group">
                    <label>완료한 세트</label>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      value={exercise.completedSets || 0}
                      onChange={(e) => updateExerciseFeedback(index, 'completedSets', parseInt(e.target.value))}
                    />
                    <span>/ {exercise.plannedSets}</span>
                  </div>
                  
                  <div className="stat-group">
                    <label>완료한 횟수</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={exercise.completedReps || 0}
                      onChange={(e) => updateExerciseFeedback(index, 'completedReps', parseInt(e.target.value))}
                    />
                    <span>/ {exercise.plannedReps}</span>
                  </div>
                </div>

                <div className="rpe-feedback">
                  <label>운동 강도 (RPE): {exercise.perceivedExertion}/10</label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={exercise.perceivedExertion || 6}
                    onChange={(e) => updateExerciseFeedback(index, 'perceivedExertion', parseInt(e.target.value))}
                    className="rpe-slider"
                  />
                  <span className="rpe-label">{rpeLabels[exercise.perceivedExertion || 6]}</span>
                </div>
              </div>
            ))}
          </section>

          {/* 추가 의견 */}
          <section className="additional-feedback">
            <h3>💬 추가 의견 (선택사항)</h3>
            <textarea
              placeholder="운동에 대한 추가 의견이나 느낀 점을 자유롭게 적어주세요..."
              value={feedback.comments}
              onChange={(e) => setFeedback({ ...feedback, comments: e.target.value })}
              maxLength={1000}
              rows={3}
            />
            <small>{feedback.comments.length}/1000자</small>
          </section>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <div className="feedback-actions">
          <button 
            onClick={handleSubmit} 
            disabled={loading}
            className="submit-button"
          >
            {loading ? '저장 중...' : '피드백 저장하기'}
          </button>
          
          {onClose && (
            <button onClick={onClose} className="cancel-button">
              나중에 하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkoutFeedback;