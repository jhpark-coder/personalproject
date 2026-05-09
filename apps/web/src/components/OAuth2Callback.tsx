import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
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
import { logger } from '../shared/lib/logger';

const OAuth2Callback: React.FC = () => {
  const navigate = useNavigate();
  const [modal, setModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'info' as 'info' | 'success' | 'error',
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

        setAuthToken(params.token);

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
        logger.error('OAuth2Callback 처리 중 오류:', error);
        showModal('로그인 실패', '소셜 로그인 처리 중 오류가 발생했습니다.', 'error');
      }
    };

    void handleOAuth2Callback();
  }, [navigate]);

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    navigate('/login');
  };

  return (
    <div className="flex min-h-dvh w-full items-center justify-center bg-slate-50 px-4 text-foreground">
      <div className="flex flex-col items-center gap-3 rounded-lg border border-white/80 bg-white p-8 text-center shadow-soft">
        <Loader2 className="size-7 animate-spin text-primary" />
        <h2 className="text-lg font-black text-slate-950">소셜 로그인 처리 중</h2>
        <p className="text-sm font-semibold text-muted-foreground">잠시만 기다려주세요.</p>
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
