import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from '@components/ui/Modal';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';
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
        const currentUrl = new URL(window.location.href);
        const urlParams = new URLSearchParams(currentUrl.search);
        
        const success = urlParams.get('success');
        const token = urlParams.get('token');
        const provider = urlParams.get('provider');
        const email = urlParams.get('email');
        const name = urlParams.get('name');
        const isNewUser = urlParams.get('isNewUser');
        const error = urlParams.get('error'); // Google에서 보낸 에러 코드 (예: access_denied)
        const calendarOnly = urlParams.get('calendarOnly');
        const errorCode = urlParams.get('errorCode'); // 백엔드에서 보낸 커스텀 에러 코드

        console.log('=== OAuth2Callback 처리 시작 ===');
        console.log('URL 파라미터:', window.location.search);
        console.log('Success:', success);
        console.log('Token present:', !!token);
        console.log('Provider:', provider);
        console.log('Error from Google:', error);
        console.log('Custom Error Code from Backend:', errorCode);

        // 에러 처리 우선
        if (error || errorCode || success !== 'true' || !token) {
          let title = '로그인 실패';
          let message = '소셜 로그인 처리 중 알 수 없는 오류가 발생했습니다. 다시 시도해주세요.';
          let modalType: 'info' | 'success' | 'error' = 'error';

          if (error === 'access_denied') {
            title = '로그인 취소';
            message = '소셜 로그인 연동을 취소하셨습니다.';
            modalType = 'info';
          } else if (errorCode === 'invalid_state') {
            title = '캘린더 연동 실패';
            message = '잘못된 요청입니다. 다시 시도해주세요.';
          } else if (errorCode === 'auth_required') {
            title = '캘린더 연동 실패';
            message = '로그인이 필요합니다. 로그인 후 다시 시도해주세요.';
          } else if (error) { // 기타 Google 에러
            message = `소셜 로그인 중 오류가 발생했습니다: ${error}. 다시 시도해주세요.`;
          } else if (success !== 'true' || !token) {
            message = '인증 정보가 올바르지 않습니다. 다시 시도해주세요.';
          }
          
          showModal(title, message, modalType);
          return;
        }

        // 토큰을 localStorage에 저장
        console.log('🔥 토큰 저장 시작 - 토큰:', token ? token.substring(0, 20) + '...' : 'null');
        localStorage.setItem('token', token);
        console.log('🔥 토큰 저장 완료 - 확인:', localStorage.getItem('token') ? '성공' : '실패');
        
        // 캘린더 전용 요청인지 확인 (URL 파라미터로 명확하게 구분)
        const isCalendarRequest = calendarOnly === 'true';

        if (isCalendarRequest) {
            console.log('🚀 캘린더 전용 요청 - 캘린더 페이지로 이동');
            localStorage.setItem('token', token);
            localStorage.removeItem('calendarLinkingInProgress');
            localStorage.setItem('calendarLinked', 'true');
            navigate('/calendar?linked=success');
            return;
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
      
      {/* 모달 */}
      {modal.isOpen && (
        <Modal
          isOpen={modal.isOpen}
          onClose={closeModal}
          title={modal.title}
          message={modal.message}
          type={modal.type}
        />
      )}
    </div>
  );
};

export default OAuth2Callback;