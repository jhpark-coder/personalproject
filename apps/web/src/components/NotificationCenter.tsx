import React, { useCallback, useEffect, useState } from 'react';
import { useUser } from '../context/UserContext';
import NavigationBar from './NavigationBar';
import './NotificationCenter.css';
import {
  createNotification,
  fetchAllUserIds,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  searchUsers,
} from '../features/notifications/api/notifications';
import type { AppNotification, SimpleUser } from '../features/notifications/api/notifications';
import { useNotificationSocket } from '../features/notifications/hooks/useNotificationSocket';
import {
  countUnreadNotifications,
  mergeIncomingNotification,
  mergeNotifications,
} from '../features/notifications/lib/notificationState';

const NotificationCenter: React.FC = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin sender UI state
  const isAdmin = (user?.role || '').includes('ROLE_ADMIN');
  const [sendScope, setSendScope] = useState<'ALL' | 'PERSON'>('ALL');
  const [emailInput, setEmailInput] = useState('');
  const [emailCandidates, setEmailCandidates] = useState<SimpleUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SimpleUser | null>(null);
  const [messageInput, setMessageInput] = useState('');

  // 알림 목록 조회
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const fetchedNotifications = await fetchNotifications(user.id);
      setNotifications((prev) => mergeNotifications(prev, fetchedNotifications));
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // 알림 읽음 처리
  const markAsRead = async (notificationId: string) => {
    try {
      if (await markNotificationRead(notificationId)) {
        // 로컬 상태 업데이트
        setNotifications(prev => 
          prev.map(notification => 
            notification._id === notificationId 
              ? { ...notification, isRead: true }
              : notification
          )
        );
        
      }
    } catch (err) {
      console.error('알림 읽음 처리 실패:', err);
    }
  };

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.isRead);
      await markAllNotificationsRead(unreadNotifications.map((notification) => notification._id));

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

  useNotificationSocket({
    userId: user?.id,
    role: user?.role,
    onNotification: (notification) => {
      setNotifications((prev) => mergeIncomingNotification(prev, notification));

      if (window.Notification.permission === 'granted') {
        new window.Notification('FitMate 알림', {
          body: notification.message,
          icon: '/favicon.ico',
          requireInteraction: false,
          silent: true,
        });
      }
    },
  });

  useEffect(() => {
    void loadNotifications();

    // 30초마다 알림 새로고침 (Socket.IO가 실패할 경우를 대비)
    const interval = setInterval(() => {
      void loadNotifications();
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [loadNotifications]);

  useEffect(() => {
    setUnreadCount(countUnreadNotifications(notifications));
  }, [notifications]);

  // 브라우저 알림 권한 요청
  const requestNotificationPermission = async () => {
    if (window.Notification.permission === 'default') {
      const permission = await window.Notification.requestPermission();
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
    setSearching(true);

    const timeout = setTimeout(async () => {
      try {
        setEmailCandidates(await searchUsers(emailInput.trim(), 5, controller.signal));
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
    setSearching(true);
    try {
      setEmailCandidates(await searchUsers(emailInput.trim(), 30));
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
      const users = await fetchAllUserIds();

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
      const requests = payloads.map((payload) => createNotification(payload));

      const results = await Promise.allSettled(requests);
      const success = results.filter(
        (result): result is PromiseFulfilledResult<Response> => result.status === 'fulfilled' && result.value.ok,
      ).length;

      setMessageInput('');
      alert(`전체 발송 완료: ${success}/${payloads.length}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '전체 발송 실패');
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
      const res = await createNotification(payload);
      if (!res.ok) throw new Error('개인 발송 실패');
      setMessageInput('');
      alert(`개인 발송 완료: ${selectedUser.email}`);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '개인 발송 실패');
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
          <button onClick={loadNotifications} className="retry-button">
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
            {window.Notification.permission === 'default' && (
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
