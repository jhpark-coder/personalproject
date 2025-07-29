import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import './OAuth2Callback.css';

const OAuth2Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    const code = searchParams.get('code');
    // const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      setModal({
        isOpen: true,
        title: '로그인 실패',
        message: '소셜 로그인에 실패했습니다.',
        type: 'error'
      });
      return;
    }

    if (!code) {
      setModal({
        isOpen: true,
        title: '인증 오류',
        message: '인증 코드가 없습니다.',
        type: 'error'
      });
      return;
    }

    // 백엔드로 인증 코드 전송
    handleOAuth2Callback();
  }, [searchParams]);

  const handleOAuth2Callback = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.OAUTH2_LOGIN_SUCCESS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // 쿠키 포함
      });

      const data = await response.json();
      
      if (data.success) {
        setModal({
          isOpen: true,
          title: '로그인 성공',
          message: data.message || '소셜 로그인이 완료되었습니다!',
          type: 'success'
        });
        
        // 2초 후 메인 페이지로 이동
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } else {
        setModal({
          isOpen: true,
          title: '로그인 실패',
          message: data.message || '소셜 로그인에 실패했습니다.',
          type: 'error'
        });
      }
    } catch (error) {
      console.error('OAuth2 콜백 처리 실패:', error);
      setModal({
        isOpen: true,
        title: '연결 오류',
        message: '서버와의 연결에 실패했습니다.',
        type: 'error'
      });
    }
  };

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