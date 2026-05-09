import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_ENDPOINTS } from '../../../shared/config/api';
import { getAuthToken } from '../../../shared/lib/storage';
import type { AppNotification } from '../api/notifications';
import { logger } from '../../../shared/lib/logger';

interface UseNotificationSocketOptions {
  userId?: number;
  role?: string;
  onNotification: (notification: AppNotification, channel: 'direct' | 'broadcast') => void;
}

export const useNotificationSocket = ({
  userId,
  onNotification,
}: UseNotificationSocketOptions) => {
  const socketRef = useRef<Socket | null>(null);
  const notificationHandlerRef = useRef(onNotification);

  useEffect(() => {
    notificationHandlerRef.current = onNotification;
  }, [onNotification]);

  useEffect(() => {
    if (!userId) return undefined;
    const token = getAuthToken();

    try {
      const socket = io(API_ENDPOINTS.COMMUNICATION_SERVER_URL || '', {
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 5,
        auth: { token, userId: String(userId) },
        withCredentials: true,
      });

      socket.on('connect', () => {
        logger.debug('🔌 알림 Socket.IO 연결됨');
        socket.emit('subscribe', { userId });
      });

      socket.on('newNotification', (data: AppNotification) => {
        logger.debug('📢 새 알림 수신:', data);
        notificationHandlerRef.current(data, 'direct');
      });

      socket.on('broadcastNotification', (data: AppNotification) => {
        logger.debug('📢 전체 브로드캐스트 수신:', data);
        notificationHandlerRef.current(data, 'broadcast');
      });

      socket.on('connect_error', (error) => {
        logger.error('알림 Socket.IO 연결 에러:', error);
      });

      socket.on('disconnect', (reason) => {
        logger.debug('🔌 알림 Socket.IO 연결 해제됨:', reason);
      });

      socketRef.current = socket;

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    } catch (error) {
      logger.error('알림 Socket.IO 연결 실패:', error);
      return undefined;
    }
  }, [userId]);

  return socketRef;
};
