import React from 'react';
import './MessageInput.css';

interface MessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  placeholder: string;
}

const MessageInput: React.FC<MessageInputProps> = ({ 
  value, 
  onChange, 
  onSend, 
  onKeyPress, 
  placeholder 
}) => {
  const handleSend = () => {
    onSend();
  };

  return (
    <div className="message-input-container">
      <div className="message-input-wrapper">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyPress={onKeyPress}
          placeholder={placeholder}
          className="message-input-field"
          aria-label="메시지 입력"
          title="Enter로 전송, Shift+Enter로 줄바꿈"
        />
        <button onClick={handleSend} className="send-button" aria-label="메시지 전송">전송</button>
      </div>
    </div>
  );
};

export default MessageInput; 