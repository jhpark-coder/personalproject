import React from 'react';
import './UserList.css';

interface User {
  username: string;
  status: 'online' | 'offline';
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface UserListProps {
  users: User[];
  currentUser: string | null;
  onSelectUser: (username: string) => void;
  unreadCounts: Map<string, number>;
}

const UserList: React.FC<UserListProps> = ({ users, currentUser, onSelectUser, unreadCounts }) => {
  // 시간 포맷팅 함수
  const formatTime = (timestamp: string) => {
    if (!timestamp) return '';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 사용자를 최근 메시지 시간순으로 정렬 (카카오톡 스타일)
  const sortedUsers = [...users].sort((a, b) => {
    // 메시지가 없는 사용자는 맨 아래로
    if (!a.lastMessage && !b.lastMessage) return 0;
    if (!a.lastMessage) return 1;
    if (!b.lastMessage) return -1;

    // 최근 메시지 시간순으로 내림차순 정렬 (최신이 위로)
    return new Date(b.lastMessage.timestamp).getTime() - new Date(a.lastMessage.timestamp).getTime();
  });

  // 온라인/오프라인 사용자 수 계산
  const onlineCount = sortedUsers.filter(user => user.status === 'online').length;
  const offlineCount = sortedUsers.filter(user => user.status === 'offline').length;

  return (
    <div className="user-list">
      <div className="user-list-header">
        <h6 className="mb-0">사용자 목록 (온라인: {onlineCount}, 오프라인: {offlineCount})</h6>
      </div>
      <div className="users-container">
        {sortedUsers.length === 0 ? (
          <div className="no-users">
            <i className="fas fa-users"></i>
            <p>접속한 사용자가 없습니다</p>
          </div>
        ) : (
          sortedUsers.map((user) => (
            <div
              key={user.username}
              className={`user-item ${currentUser === user.username ? 'active' : ''} ${user.status === 'offline' ? 'offline' : ''}`}
              onClick={() => onSelectUser(user.username)}
            >
              <div className="user-avatar">
                <span className={`user-status ${user.status}`}></span>
                <div className="avatar-placeholder">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="user-info">
                <div className="user-header">
                  <span className="username">{user.username}</span>
                  {user.status === 'offline' && (
                    <span className="offline-label">(오프라인)</span>
                  )}
                  {user.lastMessage && (
                    <span className="message-time">
                      {formatTime(user.lastMessage.timestamp)}
                    </span>
                  )}
                </div>
                {user.lastMessage ? (
                  <div className="last-message">
                    {user.lastMessage.content.length > 25
                      ? user.lastMessage.content.substring(0, 25) + '...'
                      : user.lastMessage.content
                    }
                  </div>
                ) : (
                  <div className="no-message">
                    <span>메시지 없음</span>
                  </div>
                )}
              </div>
              {(unreadCounts.get(user.username) || 0) > 0 && (
                <span className="unread-badge">{unreadCounts.get(user.username) || 0}</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList; 