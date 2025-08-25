import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingGoal.css';

interface GoalOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const goalOptions: GoalOption[] = [
  {
    id: 'strength',
    title: '스트렝스 근력 키우기',
    description: '누구보다 강한 힘을 가지고 싶어요.',
    icon: '💪',
    color: '#FF3B30'
  },
  {
    id: 'body',
    title: '탄탄한 몸 만들기',
    description: '멋진 몸매를 만들고 싶어요.',
    icon: '🏃‍♂️',
    color: '#007AFF'
  },
  {
    id: 'diet',
    title: '다이어트 성공하기',
    description: '이번엔 살을 꼭 빼고 싶어요.',
    icon: '⚖️',
    color: '#AF52DE'
  },
  {
    id: 'fitness',
    title: '신체 능력 향상 시키기',
    description: '다양한 운동을 잘해내고 싶어요.',
    icon: '📈',
    color: '#34C759'
  },
  {
    id: 'stamina',
    title: '체력 키우기',
    description: '지치지 않는 체력을 만들고 싶어요.',
    icon: '⚡',
    color: '#FF9500'
  }
];

const OnboardingGoal: React.FC = () => {
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const navigate = useNavigate();

  const handleGoalSelect = (goalId: string) => {
    setSelectedGoal(goalId);
  };

  const handleNext = () => {
    if (selectedGoal) {
      // 선택된 목표를 저장하고 다음 페이지로 이동
      localStorage.setItem('userGoal', selectedGoal);
      navigate('/onboarding/basic-info');
    }
  };

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">운동 목표</div>
          <div></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '50%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">어떤 목표를 이뤄볼까요?</h1>
          <p className="question-subtitle">목표는 언제든 자유롭게 바꿀 수 있어요.</p>
        </div>

        <div className="options-section">
          {goalOptions.map((goal) => (
            <div
              key={goal.id}
              className={`option-card ${selectedGoal === goal.id ? 'selected' : ''}`}
              onClick={() => handleGoalSelect(goal.id)}
            >
              <div className="option-content">
                <div className="goal-icon" style={{ backgroundColor: goal.color }}>
                  {goal.icon}
                </div>
                <div className="option-text">
                  <h3 className="option-title">{goal.title}</h3>
                  <p className="option-description">{goal.description}</p>
                </div>
              </div>
              {selectedGoal === goal.id && (
                <div className="selected-indicator">
                  <div className="check-icon">✓</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 */}
      <div className="bottom-button-container">
        <button
          className={`button button-primary button-full ${!selectedGoal ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!selectedGoal}
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default OnboardingGoal; 