import React from 'react';
import './ChatStats.css';

const ChatStats = ({ onlineUsers, totalMessages }) => {
    return (
        <div className="chat-stats">
            <div className="stat-card">
                <div className="stat-number">{onlineUsers}</div>
                <div className="stat-label">온라인 사용자</div>
            </div>
            <div className="stat-card">
                <div className="stat-number">{totalMessages}</div>
                <div className="stat-label">상담 대기</div>
            </div>
        </div>
    );
};

export default ChatStats; 