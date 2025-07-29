import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from './Modal';
import { API_ENDPOINTS } from '../config/api';
import './OAuth2Callback.css';

const OAuth2Success: React.FC = () => {
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
    type: 'success'
  });

  useEffect(() => {
    // 성공 페이지에서 사용자 정보 가져오기
    handleOAuth2Success();
  }, []);

  const handleOAuth2Success = async () => {
    try {
      const response = await fetch(API_ENDPOINTS.OAUTH2_LOGIN_SUCCESS, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
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
      console.error('OAuth2 성공 처리 실패:', error);
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
        <h2>로그인 성공!</h2>
        <div className="loading-spinner" style={{ borderTopColor: '#4CAF50' }}></div>
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

export default OAuth2Success; 