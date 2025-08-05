import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationBarProps {
  className?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ className = '' }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={`navigation-bar ${className}`}>
      <Link to="/" className={`nav-item ${isActive('/') ? 'active' : ''}`}>
        <div className="nav-icon">🏠</div>
        <span>홈</span>
      </Link>
      <Link to="/calendar" className={`nav-item ${isActive('/calendar') ? 'active' : ''}`}>
        <div className="nav-icon">📅</div>
        <span>캘린더</span>
      </Link>
      <Link to="/programs" className={`nav-item ${isActive('/programs') ? 'active' : ''}`}>
        <div className="nav-icon">🏋️‍♂️</div>
        <span>라이브러리</span>
      </Link>
      <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <div className="nav-icon">👤</div>
        <span>마이페이지</span>
      </Link>
    </div>
  );
};

export default NavigationBar; 