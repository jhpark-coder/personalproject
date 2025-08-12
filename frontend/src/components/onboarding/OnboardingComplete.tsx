import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../../config/api';
import './OnboardingComplete.css';

const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnectingCalendar(true);
      const token = localStorage.getItem('token');
      const userId = getUserIdFromToken(token); // JWT에서 userId 추출 함수 필요

      // 온보딩 완료 플래그 설정 (연동 진행 시에도 완료로 간주)
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        const provider = localStorage.getItem('currentProvider');
        if (provider) {
          localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
        }
      } catch {}

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
      setIsConnectingCalendar(false);
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

  const handleSkipCalendar = () => {
    try {
      localStorage.setItem('onboardingCompleted', 'true');
      const provider = localStorage.getItem('currentProvider');
      if (provider) {
        localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
      }
    } catch {}
    navigate('/');
  };

  return (
    <div className="onboarding-complete-container">
      <div className="complete-content">
        <div className="success-icon">🎉</div>
        <h1>온보딩 완료!</h1>
        <p>이제 FitMate와 함께 건강한 운동을 시작해보세요.</p>
        
        <div className="calendar-option">
          <h3>구글 캘린더 연동</h3>
          <p>운동 일정을 구글 캘린더와 연동하여 더 체계적으로 관리하세요.</p>
          
          <div className="calendar-benefits">
            <div className="benefit-item">
              <span className="benefit-icon">📅</span>
              <span>운동 일정 자동 동기화</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">🔔</span>
              <span>운동 알림 설정</span>
            </div>
            <div className="benefit-item">
              <span className="benefit-icon">📊</span>
              <span>운동 기록 관리</span>
            </div>
          </div>
          
          <div className="calendar-actions">
            <button 
              onClick={handleConnectGoogleCalendar}
              disabled={isConnectingCalendar}
              className="connect-calendar-btn"
            >
              {isConnectingCalendar ? '연동 중...' : '구글 캘린더 연동하기'}
            </button>
            <button 
              onClick={handleSkipCalendar}
              className="skip-calendar-btn"
            >
              나중에 하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingComplete; 