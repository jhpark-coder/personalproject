import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';
import './OnboardingComplete.css';

const OnboardingComplete: React.FC = () => {
  const navigate = useNavigate();
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);

  const handleConnectGoogleCalendar = async () => {
    try {
      setIsConnectingCalendar(true);
      const token = localStorage.getItem('token');
      if (!token) {
        alert('로그인이 필요합니다.');
        return;
      }

      // 온보딩 완료 플래그 설정 (연동 진행 시에도 완료로 간주)
      try {
        localStorage.setItem('onboardingCompleted', 'true');
        const provider = localStorage.getItem('currentProvider');
        if (provider) {
          localStorage.setItem(`onboardingCompleted_${provider}`, 'true');
        }
      } catch {}

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