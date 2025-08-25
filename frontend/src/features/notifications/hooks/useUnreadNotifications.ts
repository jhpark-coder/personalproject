import { useState, useEffect } from 'react';
import { communicationClient, handleApiError } from '@utils/axiosConfig';

export const useUnreadNotifications = (userId?: number) => {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = async () => {
    if (!userId) return;

    try {
      const response = await communicationClient.get(`/api/notifications/user/${userId}/unread-count`);
      const data = response.data;
      const count = typeof data === 'number' ? data : data?.unreadCount ?? 0;
      setUnreadCount(count);
    } catch (err) {
      console.error('읽지 않은 알림 개수 조회 실패:', handleApiError(err));
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  return { unreadCount, refetch: fetchUnreadCount };
}; 