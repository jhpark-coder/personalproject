import React from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../NavigationBar';

const WorkoutStats: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="workout-stats-container">
      <div className="header">
        <div className="header-content">
          <button className="back-button" onClick={() => navigate(-1)}>
            ←
          </button>
          <div className="header-title">운동 통계</div>
          <div></div>
        </div>
      </div>
      
      <div className="stats-content">
        <h1>운동 통계 페이지</h1>
        <p>여기에 운동 통계가 표시됩니다.</p>
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default WorkoutStats; 