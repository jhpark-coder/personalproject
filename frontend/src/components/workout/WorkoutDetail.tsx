import React from 'react';
import { useNavigate } from 'react-router-dom';

const WorkoutDetail: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="workout-detail-container content-wrapper">
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)} aria-label="뒤로 가기">
            ←
          </button>
          <div className="header-title">프로그램 상세</div>
          <div></div>
        </div>
      </div>
      
      <div className="detail-content">
        <h1>운동 프로그램 상세 페이지</h1>
        <p>여기에 프로그램 상세 정보가 표시됩니다.</p>
        {/* 로딩 시 사용할 스켈레톤 프레임 예시 */}
        <div style={{ marginTop: 16 }}>
          <div className="skeleton skeleton-bar" style={{ width: '50%', marginBottom: 12 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 160 }}></div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutDetail; 