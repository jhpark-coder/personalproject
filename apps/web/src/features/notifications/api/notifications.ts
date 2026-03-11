import { API_ENDPOINTS } from '../../../shared/config/api';
import { getAuthToken } from '../../../shared/lib/storage';

export interface AppNotification {
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

export interface SimpleUser {
  id: number;
  email: string;
  name: string;
  birthDate?: string;
}

export interface CreateNotificationPayload {
  senderUserId: number;
  targetUserId: number;
  message: string;
  type: string;
  category: string;
}

interface SearchUserPayload {
  id?: number;
  email?: string;
  name?: string;
  birthDate?: string;
}

const toNotifications = (data: unknown): AppNotification[] => {
  if (Array.isArray(data)) {
    return data as AppNotification[];
  }

  if (data && typeof data === 'object' && Array.isArray((data as { notifications?: unknown[] }).notifications)) {
    return (data as { notifications: AppNotification[] }).notifications;
  }

  return [];
};

export const fetchNotifications = async (userId: number) => {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/user/${userId}`);
  if (!response.ok) {
    throw new Error('알림을 불러오는데 실패했습니다.');
  }

  return toNotifications(await response.json());
};

export const fetchUnreadCount = async (userId: number) => {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/user/${userId}/unread-count`);
  if (!response.ok) {
    return 0;
  }

  const data = await response.json();
  return typeof data === 'number' ? data : data?.unreadCount ?? 0;
};

export const markNotificationRead = async (notificationId: string) => {
  const response = await fetch(`${API_ENDPOINTS.NOTIFICATIONS}/${notificationId}/read`, {
    method: 'PUT',
  });

  return response.ok;
};

export const markAllNotificationsRead = async (notificationIds: string[]) => {
  await Promise.all(notificationIds.map((notificationId) => markNotificationRead(notificationId)));
};

export const searchUsers = async (query: string, size: number, signal?: AbortSignal) => {
  const token = getAuthToken();
  const params = new URLSearchParams({ q: query, size: String(size) });
  const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/users/search?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal,
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const items = Array.isArray(data)
    ? data
    : Array.isArray((data as { content?: unknown[] } | null)?.content)
      ? (data as { content: unknown[] }).content
      : [];

  return items.map((item) => {
    const user = item as SearchUserPayload;
    return {
      id: user.id ?? 0,
      email: user.email ?? '',
      name: user.name ?? '',
      birthDate: user.birthDate,
    };
  });
};

export const fetchAllUserIds = async () => {
  const token = getAuthToken();
  const response = await fetch(`${API_ENDPOINTS.BACKEND_URL}/api/users/ids`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    throw new Error('사용자 목록 조회 실패');
  }

  return response.json() as Promise<Array<{ id: number }>>;
};

export const createNotification = async (payload: CreateNotificationPayload) => {
  return fetch(API_ENDPOINTS.CREATE_NOTIFICATION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
};
