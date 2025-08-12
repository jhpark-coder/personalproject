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

interface SimpleUser {
  id: number;
  email: string;
  name: string;
  birthDate?: string;
}

const NotificationCenter: React.FC = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Admin sender UI state
  const isAdmin = (user?.role || '').includes('ROLE_ADMIN');
  const [sendScope, setSendScope] = useState<'ALL' | 'PERSON'>('ALL');
  const [emailInput, setEmailInput] = useState('');
  const [emailCandidates, setEmailCandidates] = useState<SimpleUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SimpleUser | null>(null);
  const [messageInput, setMessageInput] = useState('');

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
        auth: { userId: String(user.id), roles: user.role ? [user.role] : [] }
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

      // 전체 브로드캐스트 수신
      socket.on('broadcastNotification', (data) => {
        console.log('📢 전체 브로드캐스트 수신:', data);
        setNotifications(prev => [data, ...prev]);
        setUnreadCount(prev => prev + 1);
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

  // ===== Admin: 이메일 실시간 검색 =====
  useEffect(() => {
    if (!isAdmin) return;
    if (sendScope === 'ALL') {
      setEmailCandidates([]);
      setSelectedUser(null);
      return;
    }
    if (emailInput.trim().length === 0) {
      setEmailCandidates([]);
      setSelectedUser(null);
      return;
    }

    const controller = new AbortController();
    const token = localStorage.getItem('token');
    setSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: emailInput.trim(), size: '5' });
        const res = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/users/search?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
          setEmailCandidates(items.map((u: any) => ({ id: u.id, email: u.email, name: u.name, birthDate: u.birthDate })));
        } else {
          setEmailCandidates([]);
        }
      } catch (e) {
        setEmailCandidates([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [emailInput, sendScope, isAdmin]);

  const runFullSearch = async () => {
    if (!isAdmin || sendScope === 'ALL') return;
    const token = localStorage.getItem('token');
    setSearching(true);
    try {
      const params = new URLSearchParams({ q: emailInput.trim(), size: '30' });
      const res = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/users/search?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const items = Array.isArray(data) ? data : (Array.isArray(data?.content) ? data.content : []);
        setEmailCandidates(items.map((u: any) => ({ id: u.id, email: u.email, name: u.name, birthDate: u.birthDate })));
      }
    } finally {
      setSearching(false);
    }
  };

  // ===== Admin: 발송 핸들러 =====
  const sendNotification = async () => {
    if (!isAdmin) return;
    if (!messageInput.trim()) return alert('메시지를 입력하세요.');

    try {
      // 1) 전체 사용자 ID 목록 조회 (관리자 전용)
      const token = localStorage.getItem('token');
      const resUsers = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/users/ids`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!resUsers.ok) throw new Error('사용자 목록 조회 실패');
      const users: { id: number }[] = await resUsers.json();

      if (!Array.isArray(users) || users.length === 0) {
        alert('발송 대상 사용자가 없습니다.');
        return;
      }

      const senderUserId = user?.id || 0;
      const message = messageInput.trim();

      // 2) 각 사용자별 개별 알림 생성 (DB 저장 + 접속자 실시간 전송)
      const payloads = users.map(u => ({
        senderUserId,
        targetUserId: u.id,
        message,
        type: 'admin_message',
        category: 'ADMIN' as const,
      }));

      // 병렬 전송 (너무 많으면 배치로 나눌 수 있음)
      const requests = payloads.map(p => fetch(API_ENDPOINTS.CREATE_NOTIFICATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      }));

      const results = await Promise.allSettled(requests);
      const success = results.filter(r => r.status === 'fulfilled' && (r as PromiseFulfilledResult<Response>).value.ok).length;

      setMessageInput('');
      alert(`전체 발송 완료: ${success}/${payloads.length}`);
    } catch (e: any) {
      alert(e.message || '전체 발송 실패');
    }
  };

  const sendPersonalNotification = async () => {
    if (!isAdmin) return;
    if (!selectedUser?.id) return alert('대상 사용자를 선택하세요.');
    if (!messageInput.trim()) return alert('메시지를 입력하세요.');

    const senderUserId = user?.id || 0;
    const payload = {
      senderUserId,
      targetUserId: selectedUser.id,
      message: messageInput.trim(),
      type: 'direct_message',
      category: 'ADMIN' as const,
    };

    try {
      const res = await fetch(API_ENDPOINTS.CREATE_NOTIFICATION, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('개인 발송 실패');
      setMessageInput('');
      alert(`개인 발송 완료: ${selectedUser.email}`);
    } catch (e: any) {
      alert(e.message || '개인 발송 실패');
    }
  };

  if (loading) {
    return (
      <div className="notification-center">
        <div className="notification-header">
          <div className="notification-header-content">
            <h2>🔔 알림</h2>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div className="skeleton skeleton-bar" style={{ width: '30%', marginBottom: 12 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 80, marginBottom: 8 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 80, marginBottom: 8 }}></div>
          <div className="skeleton skeleton-card" style={{ height: 80 }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notification-center">
        <div className="notification-header">
          <div className="notification-header-content">
            <h2>🔔 알림</h2>
          </div>
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
        <div className="notification-header-content">
          <h2>🔔 알림</h2>
          <div className="notification-actions">
            {Notification.permission === 'default' && (
              <button onClick={requestNotificationPermission} className="notification-permission-btn" aria-label="브라우저 알림 허용">
                알림 허용
              </button>
            )}
            {unreadCount > 0 && (
              <>
                <span className="unread-badge" aria-label={`읽지 않은 알림 ${unreadCount}개`}>{unreadCount}</span>
                <button onClick={markAllAsRead} className="mark-all-read" aria-label="모든 알림 읽음 처리">
                  모두 읽음
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="notification-inner">
        {isAdmin && (
          <div className="admin-sender" style={{ padding: 12, border: '1px solid #eee', borderRadius: 8, margin: '8px 12px' }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label>
                대상
                <select value={sendScope} onChange={(e) => { setSendScope(e.target.value as 'ALL' | 'PERSON'); setSelectedUser(null); }} style={{ marginLeft: 8 }}>
                  <option value="ALL">전체</option>
                  <option value="PERSON">개인</option>
                </select>
              </label>

              <textarea
                placeholder={sendScope === 'ALL' ? '전체 발송에서는 비활성화됩니다' : '이메일/이름 입력'}
                value={emailInput}
                onChange={(e) => { setEmailInput(e.target.value); setSelectedUser(null); }}
                disabled={sendScope === 'ALL'}
                rows={1}
                style={{ minWidth: 220, resize: 'vertical' }}
              />

              {sendScope === 'PERSON' && (
                <button onClick={runFullSearch} disabled={searching}>
                  {searching ? '검색 중...' : '검색' }
                </button>
              )}
            </div>

            {sendScope === 'PERSON' && emailCandidates.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 160, overflowY: 'auto', borderTop: '1px dashed #ddd', paddingTop: 8 }}>
                {emailCandidates.map(u => (
                  <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{u.name}</div>
                      <div style={{ fontSize: 12, color: '#666' }}>
                        {u.email}{u.birthDate ? ` · ${u.birthDate}` : ''}
                      </div>
                    </div>
                    <button onClick={() => setSelectedUser(u)} disabled={selectedUser?.id === u.id}>
                      {selectedUser?.id === u.id ? '선택됨' : '선택'}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="메시지 입력"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                style={{ flex: 1, minWidth: 260 }}
              />
              {sendScope === 'ALL' ? (
                <button onClick={sendNotification}>전체 발송</button>
              ) : (
                <button onClick={sendPersonalNotification} disabled={!selectedUser}>개인 발송</button>
              )}
            </div>
          </div>
        )}

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
      </div>

      {/* 하단 네비게이션 */}
      <NavigationBar />
    </div>
  );
};

export default NotificationCenter; 