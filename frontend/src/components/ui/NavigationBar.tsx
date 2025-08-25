import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavigationBarProps {
  className?: string;
  unreadCount?: number;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ className = '', unreadCount = 0 }) => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const NavItems = (
    <>
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
        <span>운동 정보</span>
      </Link>
      <Link to="/notifications" className={`nav-item ${isActive('/notifications') ? 'active' : ''}`}>
        <div className="nav-icon">
          🔔
          {unreadCount > 0 && (
            <span className="notification-badge">{unreadCount}</span>
          )}
        </div>
        <span>알림</span>
      </Link>
      <Link to="/profile" className={`nav-item ${isActive('/profile') ? 'active' : ''}`}>
        <div className="nav-icon">👤</div>
        <span>마이페이지</span>
      </Link>
    </>
  );

  return (
    <>
      {/* 모바일/태블릿: 하단 네비게이션 */}
      <div className={`navigation-bar ${className}`}>
        {NavItems}
      </div>

      {/* 데스크톱: 좌측 사이드바 네비게이션 */}
      <aside className="sidebar-navigation desktop-only">
        <div className="sidebar-header">FitMate</div>
        <nav className="sidebar-items">
          {NavItems}
        </nav>
      </aside>
    </>
  );
};

export default NavigationBar; 