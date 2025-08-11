import React, { useState, useEffect, useRef } from 'react';
import { useUser } from '../context/UserContext';
import { io, Socket } from 'socket.io-client';
import NavigationBar from './NavigationBar';
import './NotificationCenter.css';
import { API_ENDPOINTS } from '../config/api';

interface Notification {
  _id: string;
  senderUserId: number;
  targetUserId: number;
  message: string;
  type: string;
  category: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const NotificationCenter: React.FC = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // 알림 목록 조회
  const fetchNotifications = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/user/${user.id}`);
      
      if (!response.ok) {
        throw new Error('알림을 불러오는데 실패했습니다.');
      }

      const data = await response.json();
      // API 응답 형태 대응
      const items = Array.isArray(data) ? data : (Array.isArray(data?.notifications) ? data.notifications : []);
      setNotifications(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 읽지 않은 알림 개수 조회
  const fetchUnreadCount = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/user/${user.id}/unread-count`);
      
      if (response.ok) {
        const data = await response.json();
        const count = typeof data === 'number' ? data : data?.unreadCount ?? 0;
        setUnreadCount(count);
      }
    } catch (err) {
      console.error('읽지 않은 알림 개수 조회 실패:', err);
    }
  };

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
        method: 'PUT',
      });

      if (response.ok) {
        // 로컬 상태 업데이트
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        );
        
        // 읽지 않은 개수 업데이트
        fetchUnreadCount();
      }
    } catch (err) {
      console.error('알림 읽음 처리 실패:', err);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      
      await Promise.all(
        unreadNotifications.map(notification => 
          fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notification._id}/read`, {
            method: 'PUT',
          })
        )
      );

      // 로컬 상태 업데이트
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('모든 알림 읽음 처리 실패:', err);
    }
  };

  // 알림 타입에 따른 아이콘 반환
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'workout_reminder':
        return '🏃‍♂️';
      case 'weekly_report':
        return '📊';
      case 'goal_achievement':
        return '🎯';
      case 'workout_habit':
        return '💪';
      default:
        return '🔔';
    }
  };

  // 알림 카테고리에 따른 배경색 반환
  const getNotificationCategory = (category: string) => {
    switch (category) {
      case 'ADMIN':
        return 'admin';
      case 'SOCIAL':
        return 'social';
      case 'AUCTION':
        return 'auction';
      case 'ORDER':
        return 'order';
      default:
        return 'default';
    }
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return '방금 전';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}시간 전`;
    } else if (diffInHours < 48) {
      return '어제';
    } else {
      return date.toLocaleDateString('ko-KR');
    }
  };

  // Socket.IO 연결 설정
  const setupSocketIO = () => {
    if (!user?.id) return;

    try {
      const socket = io(API_ENDPOINTS.COMMUNICATION_SERVER_URL || '', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 5,
        auth: { userId: String(user.id) }
      });
      
      socket.on('connect', () => {
        console.log('🔌 알림 Socket.IO 연결됨');
        // 사용자 ID를 서버에 전송
        socket.emit('subscribe', { userId: user.id });
      });

      socket.on('newNotification', (data) => {
        console.log('📢 새 알림 수신:', data);
        
        // 새 알림을 목록 맨 위에 추가
        setNotifications(prev => [data, ...prev]);
        
        // 읽지 않은 개수 증가
        setUnreadCount(prev => prev + 1);
        
        // 브라우저 알림 표시
        if (Notification.permission === 'granted') {
          new Notification('FitMate 알림', {
            body: data.message,
            icon: '/favicon.ico',
            requireInteraction: false,
            silent: true
          });
        }
      });

      socket.on('connect_error', (error) => {
        console.error('알림 Socket.IO 연결 에러:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 알림 Socket.IO 연결 해제됨:', reason);
        if (reason === 'io server disconnect') {
          // 서버에서 연결을 끊은 경우 재연결 시도
          setTimeout(() => {
            if (user?.id && !socketRef.current) {
              console.log('🔄 Socket.IO 재연결 시도...');
              setupSocketIO();
            }
          }, 5000);
        }
      });

      socketRef.current = socket;
    } catch (err) {
      console.error('알림 Socket.IO 연결 실패:', err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
    setupSocketIO();

    // 30초마다 알림 새로고침 (Socket.IO가 실패할 경우를 대비)
    const interval = setInterval(() => {
      fetchNotifications();
      fetchUnreadCount();
    }, 30000);

    return () => {
      clearInterval(interval);
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?.id]);

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('✅ 브라우저 알림 권한 허용됨');
      } else {
        console.log('❌ 브라우저 알림 권한 거부됨');
      }
    }
  };

  if (loading) {
    return (
      <div className="notification-center">
        <div className="notification-header">
          <h2>🔔 알림</h2>
        </div>
        <div className="notification-loading">
          <div className="loading-spinner"></div>
          <p>알림을 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notification-center">
        <div className="notification-header">
          <h2>🔔 알림</h2>
        </div>
        <div className="notification-error">
          <p>❌ {error}</p>
          <button onClick={fetchNotifications} className="retry-button">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notification-center">
      <div className="notification-header">
        <h2>🔔 알림</h2>
        <div className="notification-actions">
          {Notification.permission === 'default' && (
            <button onClick={requestNotificationPermission} className="notification-permission-btn">
              알림 허용
            </button>
          )}
          {unreadCount > 0 && (
            <>
              <span className="unread-badge">{unreadCount}</span>
              <button onClick={markAllAsRead} className="mark-all-read">
                모두 읽음
              </button>
            </>
          )}
        </div>
      </div>

      <div className="notification-list">
        {notifications.length === 0 ? (
          <div className="no-notifications">
            <div className="no-notifications-icon">📭</div>
            <p>새로운 알림이 없습니다</p>
            <span>새로운 알림이 오면 여기에 표시됩니다</span>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification._id}
              className={`notification-item ${!notification.isRead ? 'unread' : ''} ${getNotificationCategory(notification.category)}`}
              onClick={() => !notification.isRead && markAsRead(notification._id)}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-message">
                  {notification.message}
                </div>
                <div className="notification-meta">
                  <span className="notification-time">
                    {formatDate(notification.createdAt)}
                  </span>
                  {!notification.isRead && (
                    <span className="unread-indicator">●</span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default NotificationCenter; 