import React, { useEffect, useRef, useState } from 'react';
import { Circle, Loader2, MessageCircle, Send, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { CHAT_SERVER_URL } from '../config/api';
import { useUser } from '../context/UserContext';
import { getAuthToken } from '../shared/lib/storage';
import { logger } from '../shared/lib/logger';
import NavigationBar from './NavigationBar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

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
  isModal?: boolean;
}

interface AdminStatus {
  isOnline: boolean;
  lastSeen?: Date;
}

const ChatPage: React.FC<ChatPageProps> = ({ onClose, isModal = true }) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const [adminStatus, setAdminStatus] = useState<AdminStatus>({ isOnline: false });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = getAuthToken();
    const userId = user?.id ?? 0;
    const url = CHAT_SERVER_URL && CHAT_SERVER_URL.trim().length > 0 ? CHAT_SERVER_URL : undefined;
    const newSocket = url
      ? io(url, {
          auth: { token, userId },
          withCredentials: true,
        })
      : io({
          auth: { token, userId },
          withCredentials: true,
        });

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('연결됨');
      logger.debug('채팅 서버에 연결되었습니다.');

      const nextUserId = user?.id ?? 0;
      const userRole = user?.role || 'ROLE_USER';

      if (userRole !== 'ROLE_ADMIN') {
        newSocket.emit('joinChat', { sender: `사용자_${nextUserId}` });
      }

      newSocket.emit('getHistory', { userId: nextUserId.toString() });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      setConnectionStatus('연결이 끊어졌습니다.');
      logger.debug('채팅 서버 연결이 끊어졌습니다.');
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);
      setConnectionStatus('채팅 서버에 연결할 수 없습니다.');
      logger.error('채팅 서버 연결 오류:', error);
    });

    newSocket.on('chatHistory', (data) => {
      logger.debug('채팅 히스토리:', data.history);
      setMessages(data.history || []);
    });

    newSocket.on('chatMessage', (message) => {
      setMessages((prev) => [...prev, { ...message, isAdmin: false }]);
    });

    newSocket.on('adminReply', (message) => {
      setMessages((prev) => [...prev, { ...message, isAdmin: true }]);
      setAdminStatus({ isOnline: true });
    });

    newSocket.on('adminOnline', () => {
      logger.debug('관리자 온라인');
      setAdminStatus({ isOnline: true });
    });

    newSocket.on('adminOffline', () => {
      logger.debug('관리자 오프라인');
      setAdminStatus({ isOnline: false });
    });

    newSocket.emit('checkAdminStatus');
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user?.id, user?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!inputMessage.trim() || !socket || !isConnected) return;

    const userId = user?.id ?? 0;
    const messageData = {
      sender: `사용자_${userId}`,
      content: inputMessage,
      type: 'CHAT' as const,
      recipient: null,
    };

    logger.debug('메시지 전송:', messageData);
    socket.emit('sendMessage', messageData);
    setInputMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
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

  const chatPanel = (
    <section
      className={cn(
        'flex w-full flex-col overflow-hidden bg-white text-slate-950',
        isModal ? 'h-[min(80dvh,720px)] rounded-lg border border-slate-200 shadow-xl' : 'min-h-dvh bg-slate-50 pb-24',
      )}
    >
      <header className="flex items-center justify-between border-b border-slate-100 bg-white px-4 py-3">
        <Badge variant={adminStatus.isOnline ? 'success' : 'secondary'} className="gap-2">
          <Circle className={cn('size-2.5 fill-current', adminStatus.isOnline ? 'text-emerald-600' : 'text-slate-400')} />
          {adminStatus.isOnline ? '관리자 온라인' : '관리자 오프라인'}
        </Badge>
        <Button type="button" variant="ghost" size={isModal ? 'icon' : 'sm'} onClick={onClose} aria-label="채팅 나가기">
          {isModal ? <X className="size-5" /> : '나가기'}
        </Button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50 px-4 py-4">
        {!isConnected && messages.length > 0 && (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white p-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            {connectionStatus}
          </div>
        )}

        {!isConnected && messages.length === 0 && (
          <div className="flex min-h-[calc(100dvh-10rem)] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
            <div className="flex size-14 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessageCircle className="size-7" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-950">상담 연결을 준비 중입니다</h2>
              <p className="mt-2 text-sm font-medium text-muted-foreground">
                {connectionStatus}
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              <Loader2 className="size-3.5 animate-spin" />
              실시간 채팅 서버 확인 중
            </div>
          </div>
        )}

        {messages.length === 0 && isConnected && (
          <div className="flex justify-center">
            <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">{formatDate(new Date())}</span>
          </div>
        )}

        {messages.map((message, index) => {
          const currentDate = typeof message.timestamp === 'string' ? new Date(message.timestamp) : message.timestamp;
          const prevDate =
            index > 0
              ? typeof messages[index - 1].timestamp === 'string'
                ? new Date(messages[index - 1].timestamp)
                : messages[index - 1].timestamp
              : null;

          const showDate =
            index === 0 ||
            (prevDate && currentDate instanceof Date && prevDate instanceof Date && currentDate.toDateString() !== prevDate.toDateString());
          const isAdminMessage = Boolean(message.isAdmin);

          return (
            <React.Fragment key={message.id || `${message.timestamp}-${index}`}>
              {showDate && (
                <div className="flex justify-center">
                  <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-medium text-slate-600">{formatDate(message.timestamp)}</span>
                </div>
              )}
              <div className={cn('flex flex-col gap-1', isAdminMessage ? 'items-start' : 'items-end')}>
                <div
                  className={cn(
                    'max-w-[78%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm leading-6 shadow-sm',
                    isAdminMessage ? 'rounded-bl-md bg-white text-slate-900' : 'rounded-br-md bg-primary text-primary-foreground',
                  )}
                >
                  {message.content}
                </div>
                <div className="px-1 text-[11px] text-muted-foreground">{formatTime(message.timestamp)}</div>
              </div>
            </React.Fragment>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <footer className="border-t border-slate-100 bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="메시지를 입력하세요."
            className="max-h-28 min-h-11 flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
            rows={1}
            aria-label="메시지 입력"
          />
          <Button type="button" onClick={sendMessage} disabled={!inputMessage.trim() || !isConnected} aria-label="메시지 전송">
            <Send className="size-4" />
            전송
          </Button>
        </div>
        {!isConnected && <div className="mt-2 text-xs text-muted-foreground" aria-live="polite">{connectionStatus}</div>}
      </footer>
    </section>
  );

  if (isModal) return chatPanel;

  return (
    <>
      {chatPanel}
      <NavigationBar />
    </>
  );
};

export default ChatPage;
