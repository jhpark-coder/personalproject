import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import NavigationBar from '@components/ui/NavigationBar';
import ChatButton from '@features/chat/components/ChatButton';
import './Settings.css';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [calendarStatus, setCalendarStatus] = useState<any>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkCalendarStatus();
  }, []);

  const [loading, setLoading] = useState<boolean>(true);

  const checkCalendarStatus = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR_STATUS);
      const data = response.data;
      console.log('캘린더 상태 응답:', data);
      
      // 백엔드에서 직접 connected, provider, message 필드를 반환
      if (data && data.connected !== undefined) {
        setCalendarStatus({
          connected: data.connected,
          provider: data.provider || 'google',
          message: data.message || '',
          lastSync: data.lastSync || null
        });
      } else {
        console.error('예상하지 못한 응답 형식:', data);
        setCalendarStatus({ connected: false, provider: 'google', message: '상태 확인 실패' });
      }
    } catch (error) {
      console.error('캘린더 상태 확인 실패:', error);
      setCalendarStatus({ connected: false, provider: 'google', message: '네트워크 오류' });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnecting(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('로그인이 필요합니다.');
        return;
      }
      
      const response = await apiClient.get(API_ENDPOINTS.CALENDAR_AUTH_GOOGLE);
      const data = response.data;
      if (data && data.success && data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        const errorMessage = (data && data.message) || '캘린더 연동 시작에 실패했습니다.';
        console.error('캘린더 연동 시작 실패:', errorMessage);
        alert(errorMessage);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('캘린더 연동 실패:', errorMessage);
      alert(`캘린더 연동 실패: ${errorMessage}`);
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
    if (!window.confirm('Google 캘린더 연동을 정말 해제하시겠습니까? 연동 해제 시 캘린더 기능 사용이 중지됩니다.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await apiClient.delete(API_ENDPOINTS.CALENDAR_DISCONNECT);
      
      const data = response.data;
      if (data.success) {
        // 연동 해제 성공 시 상태 업데이트
        setCalendarStatus({ 
          connected: false, 
          provider: 'google', 
          message: 'Google 캘린더 연동이 해제되었습니다.',
          lastSync: null 
        });
        
        // 성공 메시지 표시 (간단한 alert 또는 toast)
        alert('Google 캘린더 연동이 성공적으로 해제되었습니다.');
        
        // 상태 다시 확인 (선택사항)
        setTimeout(() => {
          checkCalendarStatus();
        }, 1000);
      } else {
        // 연동 해제 실패 시 에러 메시지
        const errorMessage = data.message || '연동 해제에 실패했습니다.';
        console.error('캘린더 연결 해제 실패:', errorMessage);
        alert('연동 해제에 실패했습니다: ' + errorMessage);
      }
    } catch (error) {
      const errorMessage = handleApiError(error);
      console.error('캘린더 연결 해제 실패:', errorMessage);
      alert(`연동 해제 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };
  
  return (
    <div className="settings-container">
      <div className="header">
        <div className="header-content">
          <button onClick={() => navigate(-1)} className="back-button" aria-label="뒤로 가기">
            ←
          </button>
          <div className="header-title">설정</div>
          <div className="header-actions">
            <button className="settings-button" onClick={() => navigate('/settings')} aria-label="설정으로 이동">
              ⚙️
            </button>
          </div>
        </div>
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
                    
                    <div className="info-value">2025.09</div>
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