import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle, ShieldCheck } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { Button } from './ui/button';

const ChatButton: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useUser();

  const userRole = user?.role || 'ROLE_USER';
  const isAdmin = userRole === 'ROLE_ADMIN';

  const handleChatClick = () => {
    navigate(isAdmin ? '/chat-dashboard' : '/chat');
  };

  return (
    <Button
      className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.8rem)] right-4 z-[60] size-12 rounded-full p-0 shadow-lg shadow-blue-500/25 lg:hidden"
      onClick={handleChatClick}
      aria-label={isAdmin ? '관리자 대시보드 열기' : '챗봇 문의 열기'}
      title={isAdmin ? '관리자 대시보드' : '챗봇 문의'}
    >
      {isAdmin ? (
        <ShieldCheck size={20} strokeWidth={2.2} />
      ) : (
        <MessageCircle size={20} strokeWidth={2.2} />
      )}
      <span className="sr-only">
        {isAdmin ? '관리자 대시보드' : '챗봇 문의'}
      </span>
    </Button>
  );
};

export default ChatButton;
