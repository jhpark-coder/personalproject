import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Modal from './Modal';
import './OAuth2Callback.css';

const OAuth2Failure: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [modal, setModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    isOpen: false,
    title: '로그인 실패',
    message: '소셜 로그인에 실패했습니다.',
    type: 'error'
  });

  useEffect(() => {
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    if (error) {
      setModal({
        isOpen: true,
        title: '로그인 실패',
        message: errorDescription || '소셜 로그인에 실패했습니다.',
        type: 'error'
      });
    }
  }, [searchParams]);

  const closeModal = () => {
    setModal(prev => ({ ...prev, isOpen: false }));
    navigate('/login');
  };

  return (
    <div className="oauth2-callback-container">
      <div className="oauth2-callback-content">
        <h2>로그인 실패</h2>
        <div className="loading-spinner" style={{ borderTopColor: '#f44336' }}></div>
        <p>소셜 로그인에 실패했습니다.</p>
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

export default OAuth2Failure; 