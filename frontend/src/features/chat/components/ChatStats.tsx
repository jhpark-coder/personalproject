import React from 'react';
import './ChatStats.css';

interface ChatStatsProps {
  onlineUsers: number;
  totalMessages: number;
}

const ChatStats: React.FC<ChatStatsProps> = ({ onlineUsers, totalMessages }) => {
  return (
    <div className="chat-stats">
      <div className="stat-card">
        <div className="stat-number">{onlineUsers}</div>
        <div className="stat-label">온라인</div>
      </div>
      <div className="stat-card">
        <div className="stat-number">{totalMessages}</div>
        <div className="stat-label">대기</div>
      </div>
    </div>
  );
};

export default ChatStats; 