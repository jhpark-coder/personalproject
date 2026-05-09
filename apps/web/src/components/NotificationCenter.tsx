import React, { useCallback, useEffect, useState } from 'react';
import { Activity, BarChart3, Bell, CheckCheck, Dumbbell, Inbox, Mail, Search, Send, Trophy } from 'lucide-react';
import { useUser } from '../context/UserContext';
import NavigationBar from './NavigationBar';
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
import { logger } from '../shared/lib/logger';
import {
  countUnreadNotifications,
  mergeIncomingNotification,
  mergeNotifications,
} from '../features/notifications/lib/notificationState';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ErrorState, LoadingState } from './ui/feedback';
import { Input } from './ui/input';
import { Page, PageHeader, PageHeaderContent, PageMain } from './ui/page';
import { cn } from '../lib/utils';

const canUseBrowserNotifications = () => typeof window !== 'undefined' && 'Notification' in window;

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'workout_reminder':
      return Dumbbell;
    case 'weekly_report':
      return BarChart3;
    case 'goal_achievement':
      return Trophy;
    case 'workout_habit':
      return Activity;
    default:
      return Bell;
  }
};

const getCategoryClassName = (category: string) => {
  switch (category) {
    case 'ADMIN':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'SOCIAL':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'AUCTION':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'ORDER':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    default:
      return 'border-slate-200 bg-white text-slate-700';
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

  if (diffInHours < 1) return '방금 전';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}시간 전`;
  if (diffInHours < 48) return '어제';
  return date.toLocaleDateString('ko-KR');
};

const NotificationCenter: React.FC = () => {
  const { user } = useUser();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = (user?.role || '').includes('ROLE_ADMIN');
  const [sendScope, setSendScope] = useState<'ALL' | 'PERSON'>('ALL');
  const [emailInput, setEmailInput] = useState('');
  const [emailCandidates, setEmailCandidates] = useState<SimpleUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SimpleUser | null>(null);
  const [messageInput, setMessageInput] = useState('');
  const notificationPermission = canUseBrowserNotifications() ? window.Notification.permission : 'denied';

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const fetchedNotifications = await fetchNotifications(user.id);
      setNotifications((prev) => mergeNotifications(prev, fetchedNotifications));
    } catch (err) {
      setError(err instanceof Error ? err.message : '알림을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const markAsRead = async (notificationId: string) => {
    try {
      if (await markNotificationRead(notificationId)) {
        setNotifications((prev) =>
          prev.map((notification) =>
            notification._id === notificationId ? { ...notification, isRead: true } : notification,
          ),
        );
      }
    } catch (err) {
      logger.error('알림 읽음 처리 실패:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notifications.filter((notification) => !notification.isRead);
      await markAllNotificationsRead(unreadNotifications.map((notification) => notification._id));
      setNotifications((prev) => prev.map((notification) => ({ ...notification, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      logger.error('모든 알림 읽음 처리 실패:', err);
    }
  };

  useNotificationSocket({
    userId: user?.id,
    role: user?.role,
    onNotification: (notification) => {
      setNotifications((prev) => mergeIncomingNotification(prev, notification));

      if (canUseBrowserNotifications() && window.Notification.permission === 'granted') {
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

  const requestNotificationPermission = async () => {
    if (canUseBrowserNotifications() && window.Notification.permission === 'default') {
      const permission = await window.Notification.requestPermission();
      logger.debug(permission === 'granted' ? '브라우저 알림 권한 허용됨' : '브라우저 알림 권한 거부됨');
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    if (sendScope === 'ALL' || emailInput.trim().length === 0) {
      setEmailCandidates([]);
      setSelectedUser(null);
      return;
    }

    const controller = new AbortController();
    setSearching(true);

    const timeout = setTimeout(async () => {
      try {
        setEmailCandidates(await searchUsers(emailInput.trim(), 5, controller.signal));
      } catch {
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

  const sendNotification = async () => {
    if (!isAdmin) return;
    if (!messageInput.trim()) return alert('메시지를 입력하세요.');

    try {
      const users = await fetchAllUserIds();

      if (!Array.isArray(users) || users.length === 0) {
        alert('발송 대상 사용자가 없습니다.');
        return;
      }

      const senderUserId = user?.id || 0;
      const message = messageInput.trim();
      const payloads = users.map((targetUser) => ({
        senderUserId,
        targetUserId: targetUser.id,
        message,
        type: 'admin_message',
        category: 'ADMIN' as const,
      }));

      const results = await Promise.allSettled(payloads.map((payload) => createNotification(payload)));
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

    const payload = {
      senderUserId: user?.id || 0,
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

  return (
    <Page>
      <PageHeader>
        <PageHeaderContent className="justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Bell className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">알림</h1>
              <p className="text-sm text-muted-foreground">운동 일정, 리포트, 관리자 메시지를 확인합니다.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {notificationPermission === 'default' && (
              <Button type="button" variant="outline" onClick={requestNotificationPermission} aria-label="브라우저 알림 허용">
                알림 허용
              </Button>
            )}
            {unreadCount > 0 && (
              <>
                <Badge aria-label={`읽지 않은 알림 ${unreadCount}개`}>{unreadCount}</Badge>
                <Button type="button" variant="secondary" onClick={markAllAsRead} aria-label="모든 알림 읽음 처리">
                  <CheckCheck className="size-4" />
                  모두 읽음
                </Button>
              </>
            )}
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className="space-y-4">
        {loading && <LoadingState title="알림을 불러오는 중입니다." />}
        {!loading && error && <ErrorState message={error} onRetry={loadNotifications} />}

        {!loading && !error && isAdmin && (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="size-5 text-primary" />
                관리자 알림 발송
              </CardTitle>
              <CardDescription>전체 사용자 또는 선택한 사용자에게 알림을 보냅니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[160px_1fr_auto]">
                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  대상
                  <select
                    value={sendScope}
                    onChange={(e) => {
                      setSendScope(e.target.value as 'ALL' | 'PERSON');
                      setSelectedUser(null);
                    }}
                    className="h-11 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="ALL">전체</option>
                    <option value="PERSON">개인</option>
                  </select>
                </label>

                <label className="grid gap-1 text-sm font-medium text-slate-700">
                  사용자 검색
                  <Input
                    placeholder={sendScope === 'ALL' ? '전체 발송에서는 비활성화됩니다.' : '이메일 또는 이름 입력'}
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setSelectedUser(null);
                    }}
                    disabled={sendScope === 'ALL'}
                  />
                </label>

                <Button type="button" variant="outline" className="self-end" onClick={runFullSearch} disabled={sendScope === 'ALL' || searching}>
                  <Search className="size-4" />
                  {searching ? '검색 중' : '검색'}
                </Button>
              </div>

              {sendScope === 'PERSON' && emailCandidates.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2">
                  {emailCandidates.map((candidate) => (
                    <div key={candidate.id} className="flex items-center justify-between gap-3 rounded-md p-2 hover:bg-white">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">{candidate.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {candidate.email}
                          {candidate.birthDate ? ` · ${candidate.birthDate}` : ''}
                        </div>
                      </div>
                      <Button type="button" size="sm" variant={selectedUser?.id === candidate.id ? 'secondary' : 'outline'} onClick={() => setSelectedUser(candidate)} disabled={selectedUser?.id === candidate.id}>
                        {selectedUser?.id === candidate.id ? '선택됨' : '선택'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-3 md:flex-row">
                <Input
                  type="text"
                  placeholder="메시지 입력"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="md:flex-1"
                />
                {sendScope === 'ALL' ? (
                  <Button type="button" onClick={sendNotification}>
                    전체 발송
                  </Button>
                ) : (
                  <Button type="button" onClick={sendPersonalNotification} disabled={!selectedUser}>
                    개인 발송
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && !error && (
          <Card className="border-white/80 bg-white shadow-sm">
            <CardContent className="p-0">
              {notifications.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center gap-2 p-8 text-center text-muted-foreground">
                  <Inbox className="size-10 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-700">새로운 알림이 없습니다</p>
                  <span className="text-sm">새로운 알림이 오면 여기에 표시됩니다.</span>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {notifications.map((notification) => {
                    const Icon = getNotificationIcon(notification.type);
                    return (
                      <button
                        key={notification._id}
                        type="button"
                        className={cn(
                          'notification-item flex w-full items-start gap-3 px-4 py-4 text-left transition-colors hover:bg-slate-50',
                          !notification.isRead && 'bg-primary/5',
                        )}
                        onClick={() => {
                          if (!notification.isRead) void markAsRead(notification._id);
                        }}
                      >
                        <div className={cn('mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border', getCategoryClassName(notification.category))}>
                          <Icon className="size-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium leading-6 text-slate-900">{notification.message}</p>
                            {!notification.isRead && <span className="mt-2 size-2 shrink-0 rounded-full bg-primary" aria-label="읽지 않음" />}
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="size-3.5" />
                            <span>{formatDate(notification.createdAt)}</span>
                            <Badge variant="outline" className="h-5 px-2 text-[11px]">
                              {notification.category || 'DEFAULT'}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </PageMain>

      <NavigationBar />
    </Page>
  );
};

export default NotificationCenter;
