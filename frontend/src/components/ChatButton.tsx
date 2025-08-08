import React from 'react';
import { useNavigate } from 'react-router-dom';
import './ChatButton.css';

// JWT 토큰에서 role을 추출하는 함수
const getRoleFromToken = (): string => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 'ROLE_USER';
    
    // JWT 토큰 디코딩 (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role || 'ROLE_USER';
  } catch (error) {
    console.error('토큰에서 role 추출 실패:', error);
    return 'ROLE_USER';
  }
};

const ChatButton: React.FC = () => {
  const navigate = useNavigate();

  const handleChatClick = () => {
    const userRole = getRoleFromToken();
    const isAdmin = userRole === 'ROLE_ADMIN';
    
    if (isAdmin) {
      navigate('/chat-dashboard');
    } else {
      navigate('/chat');
    }
  };

  // 사용자 권한 확인
  const userRole = getRoleFromToken();
  const isAdmin = userRole === 'ROLE_ADMIN';

  return (
    <button className="chat-button" onClick={handleChatClick}>
      <div className="chat-button-icon">
        {isAdmin ? '👨‍💼' : '💬'}
      </div>
      <span className="chat-button-text">
        {isAdmin ? '관리자 대시보드' : '챗봇 문의'}
      </span>
    </button>
  );
};

export default ChatButton; 