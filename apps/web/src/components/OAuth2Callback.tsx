import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import {
  setAuthToken,
  setCurrentProvider,
  setOnboardingCompleted,
  setProviderOnboardingCompleted,
} from '../shared/lib/storage';
import {
  parseOAuthCallbackParams,
  resolveOAuthCallbackAction,
} from '../features/auth/lib/oauthCallback';
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
        const params = parseOAuthCallbackParams(window.location.href);
        const action = resolveOAuthCallbackAction(params);

        if (action.kind === 'error') {
          showModal('로그인 실패', action.message, 'error');
          return;
        }

        setAuthToken(params.token!);
        
        if (params.provider) {
          setCurrentProvider(params.provider);
        }

        if (action.kind === 'calendar') {
          if (params.provider) {
            setProviderOnboardingCompleted(params.provider, true);
            setOnboardingCompleted(true);
          }
          navigate('/calendar');
        } else if (action.kind === 'onboarding') {
          navigate('/onboarding/experience');
        } else {
          if (params.provider) {
            setProviderOnboardingCompleted(params.provider, true);
            setOnboardingCompleted(true);
          }
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
      <div className="oauth2-callback-content">
        <h2>소셜 로그인 처리 중...</h2>
        <div className="loading-spinner"></div>
        <p>잠시만 기다려주세요.</p>
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
