import React, { useState, useEffect, useCallback } from 'react';
import './RestTimer.css';

interface RestTimerProps {
  duration: number; // 휴식 시간 (초)
  onComplete: () => void; // 휴식 완료 콜백
  onSkip: () => void; // 휴식 건너뛰기 콜백
  nextExercise?: {
    name: string;
    set: number;
  }; // 다음 운동 정보 (선택적)
}

const RestTimer: React.FC<RestTimerProps> = ({
  duration,
  onComplete,
  onSkip,
  nextExercise
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration);
  const [isRunning, setIsRunning] = useState(false);

  // 타이머 리셋
  const resetTimer = useCallback(() => {
    setTimeRemaining(duration);
    setIsRunning(false);
  }, [duration]);

  // 타이머 시작
  const startTimer = useCallback(() => {
    setIsRunning(true);
  }, []);

  // 타이머 일시정지
  const pauseTimer = useCallback(() => {
    setIsRunning(false);
  }, []);

  // 타이머 건너뛰기
  const handleSkip = useCallback(() => {
    resetTimer();
    onSkip();
  }, [resetTimer, onSkip]);

  // 컴포넌트 마운트 시 자동으로 타이머 시작
  useEffect(() => {
    startTimer();
  }, []);

  useEffect(() => {
    if (!isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, timeRemaining, onComplete]);

  // 시간 포맷팅 (MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // 진행률 계산 (0-100)
  const progress = duration > 0 ? ((duration - timeRemaining) / duration) * 100 : 0;

  // 원형 진행바 스트로크 계산
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // RestTimer is always active when rendered

  return (
    <div className="rest-timer">
      <div className="rest-timer-content">
        <div className="rest-timer-header">
          <h2 className="rest-timer-title">휴식 시간</h2>
          <p className="rest-timer-subtitle">다음 운동을 위해 잠시 쉬어주세요</p>
        </div>

        <div className="rest-timer-circle-container">
          <svg className="rest-timer-circle" viewBox="0 0 200 200">
            {/* 배경 원 */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="8"
            />
            {/* 진행 원 */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#007AFF"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 100 100)"
              style={{
                transition: 'stroke-dashoffset 1s linear'
              }}
            />
          </svg>
          
          <div className="rest-timer-text">
            <div className="rest-timer-time">{formatTime(timeRemaining)}</div>
            <div className="rest-timer-remaining">남은 시간</div>
          </div>
        </div>

        <div className="rest-timer-controls">
          <button
            className="rest-timer-button rest-timer-button-secondary"
            onClick={isRunning ? pauseTimer : startTimer}
          >
            {isRunning ? (
              <>
                <span className="button-icon">⏸️</span>
                일시정지
              </>
            ) : (
              <>
                <span className="button-icon">▶️</span>
                재시작
              </>
            )}
          </button>

          <button
            className="rest-timer-button rest-timer-button-primary"
            onClick={handleSkip}
          >
            <span className="button-icon">⏭️</span>
            건너뛰기
          </button>
        </div>

        <div className="rest-timer-tips">
          {nextExercise ? (
            <p className="rest-timer-tip">
              🏋️‍♂️ 다음: {nextExercise.name} {nextExercise.set}세트
            </p>
          ) : (
            <p className="rest-timer-tip">💡 적절한 휴식으로 운동 효과를 높여보세요</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestTimer;