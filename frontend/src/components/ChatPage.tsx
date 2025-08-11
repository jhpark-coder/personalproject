import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { CHAT_SERVER_URL } from '../config/api';
import './ChatPage.css';

// JWT 토큰에서 role과 userId를 추출하는 함수
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

// JWT 토큰에서 userId를 추출하는 함수
const getUserIdFromToken = (): number => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return 1;
    
    // JWT 토큰 디코딩 (base64)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || 1;
  } catch (error) {
    console.error('토큰에서 userId 추출 실패:', error);
    return 1;
  }
};

interface Message {
  id?: string;
  sender: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  timestamp: string | Date;
  isAdmin?: boolean;
}

interface ChatPageProps {
  onClose: () => void;
  isModal?: boolean; // 모달에서 열렸는지 여부
}

interface AdminStatus {
  isOnline: boolean;
  lastSeen?: Date;
}

const ChatPage: React.FC<ChatPageProps> = ({ onClose, isModal = true }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({ isOnline: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // JWT 토큰에서 role과 userId 추출
    const userRole = getRoleFromToken();
    const userId = getUserIdFromToken();
    
    // WebSocket 연결: 환경변수 URL이 있으면 사용, 없으면 동일 오리진(/socket.io) 사용
    const url = (CHAT_SERVER_URL && CHAT_SERVER_URL.trim().length > 0) ? CHAT_SERVER_URL : undefined;
    const newSocket = io(url as any, {
      auth: {
        userId: userId,
        roles: [userRole]
      }
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('채팅 서버에 연결되었습니다.');
      
      // 사용자 역할 확인
      const userId = getUserIdFromToken();
      const userRole = getRoleFromToken();
      
      // 관리자가 아닌 경우에만 일반 사용자로 채팅방에 입장
      if (userRole !== 'ROLE_ADMIN') {
        newSocket.emit('joinChat', { sender: `사용자_${userId}` });
      }
      
      // 채팅 히스토리 요청
      newSocket.emit('getHistory', { userId: userId.toString() });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('채팅 서버 연결이 끊어졌습니다.');
    });

    newSocket.on('chatHistory', (data) => {
      console.log('채팅 히스토리:', data.history);
      setMessages(data.history || []);
    });

    newSocket.on('chatMessage', (message) => {
      setMessages(prev => [...prev, { ...message, isAdmin: false }]);
    });

    newSocket.on('adminReply', (message) => {
      setMessages(prev => [...prev, { ...message, isAdmin: true }]);
      // 관리자가 응답했으므로 온라인 상태로 설정
      setAdminStatus({ isOnline: true });
    });

    // 관리자 온라인 상태 확인
    newSocket.on('adminOnline', () => {
      console.log('관리자 온라인');
      setAdminStatus({ isOnline: true });
    });

    newSocket.on('adminOffline', () => {
      console.log('관리자 오프라인');
      setAdminStatus({ isOnline: false });
    });

    // 연결 시 관리자 상태 확인 요청
    newSocket.emit('checkAdminStatus');

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // 메시지가 추가될 때마다 스크롤을 맨 아래로
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket) return;

    const userId = getUserIdFromToken();
    const messageData = {
      sender: `사용자_${userId}`,
      content: inputMessage,
      type: 'CHAT' as const,
      recipient: null
    };

    console.log('📤 메시지 전송:', messageData);
    socket.emit('sendMessage', messageData);
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours;
    return `${ampm} ${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };

  const formatDate = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const year = date.getFullYear().toString().slice(-2);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    return `${year}. ${month}. ${day}.(${weekday})`;
  };

  const getAdminStatusText = () => {
    if (adminStatus.isOnline) {
      return (
        <span className="admin-status online">
          <span className="status-dot"></span>
          관리자 온라인
        </span>
      );
    } else {
      return (
        <span className="admin-status offline">
          <span className="status-dot"></span>
          관리자 오프라인
        </span>
      );
    }
  };

  return (
    <div className={`chat-page ${isModal ? 'chat-modal' : 'chat-page-standalone'}`}>
      {/* 헤더 */}
      <div className="chat-header">
        <div className="chat-title">{getAdminStatusText()}</div>
        <button className="close-button" onClick={onClose}>나가기</button>
      </div>

      {/* 메시지 영역 */}
      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="date-separator">
            <span className="date-label">{formatDate(new Date())}</span>
          </div>
        )}
        
        {messages.map((message, index) => {
          const currentDate = typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp;
          const prevDate = index > 0 ? 
            (typeof messages[index - 1].timestamp === 'string' ? new Date(messages[index - 1].timestamp) : messages[index - 1].timestamp) : 
            null;
          
          const showDate = index === 0 || 
            (prevDate && currentDate instanceof Date && prevDate instanceof Date && currentDate.toDateString() !== prevDate.toDateString());

          return (
            <React.Fragment key={message.id || index}>
              {showDate && (
                <div className="date-separator">
                  <span className="date-label">{formatDate(message.timestamp)}</span>
                </div>
              )}
              <div className={`message ${message.isAdmin ? 'admin' : 'user'}`}>
                <div className="message-bubble">
                  {message.content}
                </div>
                <div className="message-time">
                  {formatTime(message.timestamp)}
                </div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 입력 영역 */}
      <div className="chat-input-area">
        <div className="input-container">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="메시지를 입력하세요..."
            className="message-input"
            rows={1}
          />
          <button 
            onClick={sendMessage}
            disabled={!inputMessage.trim() || !isConnected}
            className="send-button"
          >
            전송
          </button>
        </div>
        {!isConnected && (
          <div className="connection-status">
            연결 중...
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage; 