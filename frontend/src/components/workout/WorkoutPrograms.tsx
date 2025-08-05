import React from 'react';
import { useNavigate } from 'react-router-dom';
import './WorkoutPrograms.css';

interface Program {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  duration: string;
  frequency: string;
  icon: string;
  color: string;
}

const programs: Program[] = [
  {
    id: 'beginner',
    title: '완벽한 맨몸 운동',
    description: '초보자 맞춤 프로그램',
    difficulty: '초급',
    duration: '4주',
    frequency: '주 4회',
    icon: '🏃‍♂️',
    color: '#FF9500'
  },
  {
    id: 'strong-curves',
    title: '스트롱 커브스',
    description: '하체 강화 프로그램',
    difficulty: '중급',
    duration: '8주',
    frequency: '주 3회',
    icon: '💪',
    color: '#FF3B30'
  },
  {
    id: 'strength',
    title: '파워 빌딩',
    description: '근력 향상 프로그램',
    difficulty: '중급',
    duration: '12주',
    frequency: '주 4회',
    icon: '🏋️‍♂️',
    color: '#AF52DE'
  },
  {
    id: 'pull-up',
    title: '풀업 마스터',
    description: '상체 강화 프로그램',
    difficulty: '고급',
    duration: '6주',
    frequency: '주 3회',
    icon: '🤸‍♂️',
    color: '#007AFF'
  },
  {
    id: 'endurance',
    title: '지구력 트레이닝',
    description: '체력 향상 프로그램',
    difficulty: '중급',
    duration: '8주',
    frequency: '주 5회',
    icon: '⚡',
    color: '#34C759'
  }
];

const WorkoutPrograms: React.FC = () => {
  const navigate = useNavigate();

  const handleProgramClick = (programId: string) => {
    navigate(`/programs/${programId}`);
  };

  return (
    <div className="programs-container">
      {/* 헤더 */}
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">프로그램</div>
          <div></div>
        </div>
      </div>

      {/* 환영 메시지 */}
      <div className="welcome-section">
        <h1 className="welcome-title">알프님,</h1>
        <p className="welcome-subtitle">한층 더 강해질 준비가 되셨군요! 💪</p>
      </div>

      {/* 프로그램 목록 */}
      <div className="programs-list">
        {programs.map((program) => (
          <div
            key={program.id}
            className="program-card"
            onClick={() => handleProgramClick(program.id)}
          >
            <div className="program-content">
              <div className="program-info">
                <div className="difficulty-tags">
                  <span className={`tag tag-${program.difficulty === '초급' ? 'beginner' : program.difficulty === '중급' ? 'intermediate' : 'advanced'}`}>
                    {program.difficulty}
                  </span>
                </div>
                <h3 className="program-title">{program.title}</h3>
                <p className="program-description">{program.description}</p>
                <p className="program-details">
                  {program.frequency}·{program.duration}
                </p>
              </div>
              <div className="program-icon" style={{ backgroundColor: program.color }}>
                {program.icon}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorkoutPrograms; 