import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './OnboardingExperience.css';

interface ExperienceOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const experienceOptions: ExperienceOption[] = [
  {
    id: 'beginner',
    title: '초보자',
    description: '운동을 처음 시작하는 분이에요.',
    icon: '🌱',
    color: '#34C759'
  },
  {
    id: 'intermediate',
    title: '중급자',
    description: '운동 경험이 있는 분이에요.',
    icon: '🌿',
    color: '#007AFF'
  },
  {
    id: 'advanced',
    title: '고급자',
    description: '운동에 익숙한 분이에요.',
    icon: '🌳',
    color: '#FF3B30'
  }
];

const OnboardingExperience: React.FC = () => {
  const [selectedExperience, setSelectedExperience] = useState<string>('');
  const navigate = useNavigate();

  const handleExperienceSelect = (experienceId: string) => {
    setSelectedExperience(experienceId);
  };

  const handleNext = () => {
    if (selectedExperience) {
      // 선택된 경험을 저장하고 다음 페이지로 이동
      localStorage.setItem('userExperience', selectedExperience);
      navigate('/onboarding/goal');
    }
  };

  return (
    <div className="onboarding-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate('/login')}>
            ←
          </button>
          <div className="header-title">운동 경험</div>
          <div></div>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: '25%' }}></div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="onboarding-content">
        <div className="question-section">
          <h1 className="question-title">운동 경험이 어느 정도인가요?</h1>
          <p className="question-subtitle">경험에 맞는 운동을 추천해드릴게요.</p>
        </div>

        <div className="options-section">
          {experienceOptions.map((experience) => (
            <div
              key={experience.id}
              className={`option-card ${selectedExperience === experience.id ? 'selected' : ''}`}
              onClick={() => handleExperienceSelect(experience.id)}
            >
              <div className="option-content">
                <div className="experience-icon" style={{ backgroundColor: experience.color }}>
                  {experience.icon}
                </div>
                <div className="option-text">
                  <h3 className="option-title">{experience.title}</h3>
                  <p className="option-description">{experience.description}</p>
                </div>
              </div>
              {selectedExperience === experience.id && (
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
          className={`button button-primary button-full ${!selectedExperience ? 'disabled' : ''}`}
          onClick={handleNext}
          disabled={!selectedExperience}
        >
          다음
        </button>
      </div>
    </div>
  );
};

export default OnboardingExperience; 