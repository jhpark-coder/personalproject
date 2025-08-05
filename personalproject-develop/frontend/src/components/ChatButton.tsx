import React, { useState } from 'react';
import ChatPage from './ChatPage';
import './ChatButton.css';

interface ChatButtonProps {
  userId: number;
}

const ChatButton: React.FC<ChatButtonProps> = ({ userId }) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  const openChat = () => {
    setIsChatOpen(true);
  };

  const closeChat = () => {
    setIsChatOpen(false);
  };

  return (
    <>
      {/* 챗봇 버튼 */}
      <button className="chat-button" onClick={openChat}>
        <div className="chat-button-icon">💬</div>
        <span className="chat-button-text">챗봇 문의</span>
      </button>

      {/* 채팅 페이지 모달 */}
      {isChatOpen && (
        <div className="chat-modal-overlay">
                  <div className="chat-modal">
          <ChatPage userId={userId} onClose={closeChat} isModal={true} />
        </div>
        </div>
      )}
    </>
  );
};

export default ChatButton; 