import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import NavigationBar from '../NavigationBar';
import ChatButton from '../ChatButton';
import './Settings.css';

interface CalendarStatus {
  connected: boolean;
  provider?: string;
  lastSync?: string | null;
}

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const [loading, setLoading] = useState<boolean>(true);

  const checkCalendarStatus = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
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
      <div className="settings-header content-wrapper">
        <button onClick={() => navigate(-1)} className="back-button" aria-label="뒤로 가기">
          ←
        </button>
        <h1>설정</h1>
      </div>

      <div className="settings-content content-wrapper">
        {loading ? (
          <div style={{ padding: 16 }}>
            <div className="skeleton skeleton-bar" style={{ width: '40%', marginBottom: 12 }}></div>
            <div className="skeleton skeleton-card" style={{ height: 120, marginBottom: 12 }}></div>
            <div className="skeleton skeleton-card" style={{ height: 140 }}></div>
          </div>
        ) : (
          <>
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
                    aria-label="구글 캘린더 연동 해제"
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
                    aria-label="구글 캘린더 연동하기"
                  >
                    {isConnecting ? '연동 중...' : '구글 캘린더 연동하기'}
                  </button>
                </div>
              )}
            </div>

            <div className="settings-section">
              <h3>계정</h3>
              <div className="settings-items">
                <button onClick={() => navigate('/profile')} className="settings-item" aria-label="프로필 관리로 이동">
                  <div className="item-icon">👤</div>
                  <div className="item-content">
                    <div className="item-title">프로필 관리</div>
                    <div className="item-description">개인정보 및 신체정보 관리</div>
                  </div>
                  <div className="item-arrow">→</div>
                </button>
                <button onClick={() => navigate('/records-room')} className="settings-item" aria-label="나의 기록실로 이동">
                  <div className="item-icon">🏆</div>
                  <div className="item-content">
                    <div className="item-title">나의 기록실</div>
                    <div className="item-description">운동 기록 및 성과 관리</div>
                  </div>
                  <div className="item-arrow">→</div>
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>앱 정보</h3>
              <div className="app-info">
                <div className="info-card">
                  <div className="info-item">
                    <div className="info-label">버전</div>
                    <div className="info-value">1.0.0</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">개발자</div>
                    <div className="info-value">FitMate Team</div>
                  </div>
                  <div className="info-item">
                    <div className="info-label">출시일</div>
                    <div className="info-value">2024.12</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
      
      {/* 챗봇 버튼 */}
      <ChatButton />
    </div>
  );
};

export default Settings; 
