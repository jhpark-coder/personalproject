import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_ENDPOINTS } from '../../../shared/config/api';
import type { AppNotification } from '../api/notifications';

interface UseNotificationSocketOptions {
  userId?: number;
  role?: string;
  onNotification: (notification: AppNotification, channel: 'direct' | 'broadcast') => void;
}

export const useNotificationSocket = ({
  userId,
  role,
  onNotification,
}: UseNotificationSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const notificationHandlerRef = useRef(onNotification);

  useEffect(() => {
    notificationHandlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!userId) return undefined;

    try {
      const socket = io(API_ENDPOINTS.COMMUNICATION_SERVER_URL || '', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 5,
        auth: { userId: String(userId), roles: role ? [role] : [] },
      });

      socket.on('connect', () => {
        console.log('🔌 알림 Socket.IO 연결됨');
        socket.emit('subscribe', { userId });
      });

      socket.on('newNotification', (data: AppNotification) => {
        console.log('📢 새 알림 수신:', data);
        notificationHandlerRef.current(data, 'direct');
      });

      socket.on('broadcastNotification', (data: AppNotification) => {
        console.log('📢 전체 브로드캐스트 수신:', data);
        notificationHandlerRef.current(data, 'broadcast');
      });

      socket.on('connect_error', (error) => {
        console.error('알림 Socket.IO 연결 에러:', error);
      });

      socket.on('disconnect', (reason) => {
        console.log('🔌 알림 Socket.IO 연결 해제됨:', reason);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (error) {
      console.error('알림 Socket.IO 연결 실패:', error);
      return undefined;
    }
  }, [role, userId]);

  return socketRef;
};
