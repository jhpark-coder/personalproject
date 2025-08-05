import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import './Settings.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [calendarStatus, setCalendarStatus] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.CALENDAR_STATUS, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        setCalendarStatus(data.status);
      }
    } catch (error) {
      console.error('캘린더 상태 확인 실패:', error);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnecting(true);
      const token = localStorage.getItem('token');
      const userId = getUserIdFromToken(token); // JWT에서 userId 추출 함수 필요
      const response = await fetch(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      if (data.success) {
        // state 파라미터에 userId 추가
        const authUrl = `${data.authUrl}?state=user_${userId}`;
        window.location.href = authUrl;
      } else {
        console.error('캘린더 연동 시작 실패:', data.message);
      }
    } catch (error) {
      console.error('캘린더 연동 실패:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // JWT에서 userId 추출 함수
  function getUserIdFromToken(token: string | null): string {
    if (!token) return '';
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub;
    } catch {
      return '';
    }
  }

  const handleDisconnectCalendar = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_ENDPOINTS.CALENDAR_DISCONNECT, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      if (data.success) {
        setCalendarStatus({ connected: false, provider: 'google', lastSync: null });
      }
    } catch (error) {
      console.error('캘린더 연결 해제 실패:', error);
    }
  };

  return (
    <div className="settings-container">
      <div className="settings-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← 뒤로
        </button>
        <h1>설정</h1>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <h3>캘린더 연동</h3>
          
          {calendarStatus?.connected ? (
            <div className="calendar-connected">
              <div className="connection-status">
                <span className="status-icon">✅</span>
                <span>구글 캘린더가 연동되어 있습니다</span>
              </div>
              <div className="connection-info">
                <p>마지막 동기화: {calendarStatus.lastSync || '정보 없음'}</p>
              </div>
              <button 
                onClick={handleDisconnectCalendar}
                className="disconnect-btn"
              >
                연동 해제
              </button>
            </div>
          ) : (
            <div className="calendar-disconnected">
              <div className="connection-status">
                <span className="status-icon">❌</span>
                <span>구글 캘린더가 연동되어 있지 않습니다</span>
              </div>
              <div className="calendar-benefits">
                <p>캘린더 연동의 장점:</p>
                <ul>
                  <li>운동 일정 자동 동기화</li>
                  <li>운동 알림 설정</li>
                  <li>운동 기록 관리</li>
                </ul>
              </div>
              <button 
                onClick={handleConnectGoogleCalendar}
                disabled={isConnecting}
                className="connect-btn"
              >
                {isConnecting ? '연동 중...' : '구글 캘린더 연동하기'}
              </button>
            </div>
          )}
        </div>

        <div className="settings-section">
          <h3>계정</h3>
          <button onClick={() => navigate('/profile')} className="settings-item">
            <span>프로필 관리</span>
            <span>→</span>
          </button>
        </div>

        <div className="settings-section">
          <h3>앱 정보</h3>
          <div className="app-info">
            <p>버전: 1.0.0</p>
            <p>개발자: FitMate Team</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 