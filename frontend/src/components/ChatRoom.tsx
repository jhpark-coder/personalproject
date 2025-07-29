import React, { useState, useEffect, useRef } from 'react';
import MessageInput from './MessageInput';
import './ChatRoom.css';

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  type: string;
}

interface ChatRoomProps {
  currentUser: string | null;
  messages: Message[];
  onSendMessage: (content: string) => void;
  onBackToUserList: () => void;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ currentUser, messages, onSendMessage, onBackToUserList }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (inputValue.trim() && currentUser) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="chat-area">
      {/* 채팅 메시지 */}
      <div className="chat-messages">
        {!currentUser ? (
          <div className="system-message">
            <i className="fas fa-comments"></i>
            <p>채팅을 시작하려면 왼쪽에서 사용자를 선택하세요.</p>
          </div>
        ) : (
          <>
            <div className="chat-header-info">
              <button
                className="back-button"
                onClick={onBackToUserList}
                title="사용자 목록으로 돌아가기"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
              <div className="chat-header-text">
                <h6>{currentUser}와의 채팅</h6>
                <small>실시간 대화</small>
              </div>
            </div>
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <i className="fas fa-comment-dots"></i>
                  <p>아직 메시지가 없습니다. 대화를 시작해보세요!</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`message ${message.sender === '관리자' ? 'user' : 'admin'}`}
                  >
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      <div className="message-time">
                        {formatTime(message.timestamp)}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>
          </>
        )}
      </div>

      {/* 메시지 입력 - 사용자가 선택되었을 때만 표시 */}
      {currentUser && (
        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          placeholder={`${currentUser}에게 메시지 보내기...`}
        />
      )}
    </div>
  );
};

export default ChatRoom; 