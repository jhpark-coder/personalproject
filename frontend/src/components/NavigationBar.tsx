import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import { API_ENDPOINTS } from '../config/api';

interface NavigationBarProps {
  className?: string;
}

const NavigationBar: React.FC<NavigationBarProps> = ({ className = '' }) => {
  const location = useLocation();
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // 읽지 않은 알림 개수 조회
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.id) return;

      try {
        const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/user/${user.id}/unread-count`);
        if (response.ok) {
          const data = await response.json();
          const count = typeof data === 'number' ? data : data?.unreadCount ?? 0;
          setUnreadCount(count);
        }
      } catch (err) {
        console.error('읽지 않은 알림 개수 조회 실패:', err);
      }
    };

    fetchUnreadCount();
    
    // 30초마다 알림 개수 새로고침
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [user?.id]);

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
    </div>
  );
};

export default NavigationBar; 