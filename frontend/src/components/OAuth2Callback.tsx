import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_ENDPOINTS } from '../config/api';
import Modal from './Modal';
import './OAuth2Callback.css';

const OAuth2Callback: React.FC = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error'
  });

  const showModal = (title: string, message: string, type: 'info' | 'success' | 'error') => {
    setModal({ isOpen: true, title, message, type });
  };

  useEffect(() => {
    const handleOAuth2Callback = async () => {
      try {
        // HashRouter 환경에서 URL 파라미터 파싱 개선
        const currentUrl = new URL(window.location.href);
        const urlParams = new URLSearchParams(currentUrl.search);
        
        const success = urlParams.get('success');
        const token = urlParams.get('token');
        const provider = urlParams.get('provider');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        const isNewUser = urlParams.get('isNewUser');
        const error = urlParams.get('error');
        const calendarOnly = urlParams.get('calendarOnly');

        console.log('=== OAuth2Callback 처리 시작 ===');
        console.log('URL 파라미터:', window.location.search);
        console.log('Success:', success);
        console.log('Token present:', !!token);
        console.log('Token length:', token ? token.length : 0);
        console.log('Provider:', provider);
        console.log('Email:', email);
        console.log('Name:', name);
        console.log('IsNewUser:', isNewUser);
        console.log('CalendarOnly:', calendarOnly);

        if (error) {
          showModal('로그인 실패', '소셜 로그인에 실패했습니다. 다시 시도해주세요.', 'error');
          return;
        }

        if (success !== 'true' || !token) {
          showModal('로그인 실패', '인증 정보가 올바르지 않습니다. 다시 시도해주세요.', 'error');
          return;
        }

        // 토큰을 localStorage에 저장
        console.log('🔥 토큰 저장 시작 - 토큰:', token ? token.substring(0, 20) + '...' : 'null');
        localStorage.setItem('token', token);
        console.log('🔥 토큰 저장 완료 - 확인:', localStorage.getItem('token') ? '성공' : '실패');
        
        if (provider) {
          console.log('🔥 Provider 저장:', provider);
          localStorage.setItem('currentProvider', provider);
        }

        // 캘린더 전용 요청인지 확인 (URL 파라미터로 명확하게 구분)
        const isCalendarRequest = calendarOnly === 'true';
        
        console.log('캘린더 요청 여부:', isCalendarRequest);
        
        // 네비게이션 직전 토큰 최종 확인
        console.log('🔥 네비게이션 직전 토큰 확인:', localStorage.getItem('token') ? '존재' : '없음');

        if (isCalendarRequest) {
          console.log('🚀 캘린더 전용 요청 - 캘린더 페이지로 이동');
          // 캘린더 전용 요청인 경우 온보딩 완료로 설정하고 캘린더 페이지로 이동
          if (provider) {
            const providerOnboardingKey = `onboardingCompleted_${provider}`;
            localStorage.setItem(providerOnboardingKey, 'true');
            localStorage.setItem('onboardingCompleted', 'true');
          }
          navigate('/calendar');
        } else if (isNewUser === 'true') {
          console.log('🚀 새 사용자 - 온보딩 페이지로 이동');
          // 새 사용자는 온보딩 1/4 페이지로 이동
          navigate('/onboarding/experience');
        } else {
          console.log('🚀 기존 사용자 - 홈 페이지로 이동');
          // 기존 사용자의 경우 onboarding 완료 상태 설정
          if (provider) {
            const providerOnboardingKey = `onboardingCompleted_${provider}`;
            localStorage.setItem(providerOnboardingKey, 'true');
            localStorage.setItem('onboardingCompleted', 'true');
          }
          
          // 기존 사용자는 바로 홈으로 이동
          navigate('/');
        }
      } catch (error) {
        console.error('OAuth2Callback 처리 중 오류:', error);
        showModal('로그인 실패', '소셜 로그인 처리 중 오류가 발생했습니다.', 'error');
      }
    };

    handleOAuth2Callback();
  }, [navigate]);

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    navigate('/login');
  };

  return (
    <div className="oauth2-callback-container">
      <div style={{ position: 'fixed', top: '10px', left: '10px', background: 'red', color: 'white', padding: '10px', zIndex: 9999 }}>
        OAuth2Callback 렌더링됨
      </div>
      
      <div className="oauth2-callback-content">
        <h2>소셜 로그인 처리 중...</h2>
        <div className="loading-spinner"></div>
        <p>잠시만 기다려주세요.</p>
        <div style={{ marginTop: '20px', fontSize: '12px', color: '#999' }}>
          URL 파라미터: {window.location.search}
        </div>
      </div>
      
      <Modal
        isOpen={modal.isOpen}
        onClose={closeModal}
        title={modal.title}
        message={modal.message}
        type={modal.type}
      />
    </div>
  );
};

export default OAuth2Callback; 