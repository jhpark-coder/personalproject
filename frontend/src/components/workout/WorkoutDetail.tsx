import React from 'react';
import { useNavigate } from 'react-router-dom';

const WorkoutDetail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="workout-detail-container">
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">프로그램 상세</div>
          <div></div>
        </div>
      </div>
      
      <div className="detail-content">
        <h1>운동 프로그램 상세 페이지</h1>
        <p>여기에 프로그램 상세 정보가 표시됩니다.</p>
      </div>
    </div>
  );
};

export default WorkoutDetail; 