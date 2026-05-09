import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MessageCircle, MessagesSquare, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { CHAT_SERVER_URL } from '../config/api';
import { getAuthToken } from '../shared/lib/storage';
import { useUser } from '../context/UserContext';
import ChatRoom from './ChatRoom';
import NavigationBar from './NavigationBar';
import { logger } from '../shared/lib/logger';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Page, PageHeader, PageHeaderContent, PageMain } from './ui/page';
import { cn } from '../lib/utils';

interface ChatUser {
  username: string;
  status: 'online' | 'offline';
  lastMessage?: {
    content: string;
    timestamp: string;
  };
}

interface Message {
  sender: string;
  content: string;
  timestamp: string;
  type: string;
  recipient?: string;
}

const canUseBrowserNotifications = () => typeof window !== 'undefined' && 'Notification' in window;

const ChatDashboard: React.FC = () => {
  const { user } = useUser();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<Map<string, ChatUser>>(new Map());
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Map<string, Message[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const currentUserRef = useRef(currentUser);

  const joinAsAdmin = useCallback((nextSocket: Socket) => {
    nextSocket.emit('joinAsAdmin', {
      sender: '관리자',
      type: 'JOIN',
    });
  }, []);

  const normalizeUsername = useCallback((username: string) => {
    return username.startsWith('사용자_') ? username : `사용자_${username}`;
  }, []);

  const addUser = useCallback(
    (username: string) => {
      const fullUsername = normalizeUsername(username);

      if (fullUsername.includes('관리자') || fullUsername.includes('admin')) {
        logger.debug('관리자 사용자 목록에서 제외:', fullUsername);
        return;
      }

      setUsers((prev) => {
        const nextUsers = new Map(prev);
        const existingUser = nextUsers.get(fullUsername);
        nextUsers.set(fullUsername, {
          username: fullUsername,
          status: 'online',
          lastMessage: existingUser?.lastMessage,
        });
        return nextUsers;
      });
    },
    [normalizeUsername],
  );

  const removeUser = useCallback((username: string) => {
    setUsers((prev) => {
      const nextUsers = new Map(prev);
      const target = nextUsers.get(username);
      if (target) {
        nextUsers.set(username, {
          ...target,
          status: 'offline',
        });
      }
      return nextUsers;
    });
  }, []);

  const handleUserMessage = useCallback((data: Message) => {
    setMessages((prev) => [...prev, data]);
  }, []);

  const showNotification = useCallback((sender: string, content: string) => {
    if (canUseBrowserNotifications() && Notification.permission === 'granted') {
      const notification = new Notification(`새 메시지: ${sender}`, {
        body: content,
        icon: '/favicon.ico',
        requireInteraction: false,
        silent: true,
      });

      setTimeout(() => {
        notification.close();
      }, 1500);
    }

    const originalTitle = document.title;
    document.title = `[새 메시지] ${originalTitle}`;
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  }, []);

  useEffect(() => {
    const savedCurrentUser = localStorage.getItem('chat_currentUser');
    const savedAllMessages = localStorage.getItem('chat_allMessages');

    if (savedCurrentUser && savedCurrentUser !== 'null') {
      const parsedUser = JSON.parse(savedCurrentUser);
      setCurrentUser(parsedUser);
      logger.debug('복원된 현재 사용자:', parsedUser);
    }
    if (savedAllMessages) {
      const restoredMessages = new Map<string, Message[]>(JSON.parse(savedAllMessages));
      setAllMessages(restoredMessages);
      setUsers((prev) => {
        const nextUsers = new Map(prev);
        restoredMessages.forEach((items, username) => {
          if (username.includes('관리자') || username.includes('admin')) return;

          const lastMessage = items[items.length - 1];
          nextUsers.set(username, {
            username,
            status: 'offline',
            lastMessage: lastMessage
              ? {
                  content: lastMessage.content,
                  timestamp: lastMessage.timestamp,
                }
              : undefined,
          });
        });
        return nextUsers;
      });
    }

    setUsers((prev) => {
      const nextUsers = new Map(prev);
      for (const [username] of nextUsers.entries()) {
        if (username.includes('관리자') || username.includes('admin')) {
          nextUsers.delete(username);
        }
      }
      return nextUsers;
    });
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    const userId = user?.id ?? 0;
    const url = CHAT_SERVER_URL && CHAT_SERVER_URL.trim().length > 0 ? CHAT_SERVER_URL : undefined;
    const newSocket = url
      ? io(url, {
          transports: ['websocket', 'polling'],
          auth: { token, userId },
          withCredentials: true,
        })
      : io({
          transports: ['websocket', 'polling'],
          auth: { token, userId },
          withCredentials: true,
        });

    newSocket.on('connect', () => {
      logger.debug('관리자 대시보드 연결 성공');
      setConnectionStatus('연결됨');
      joinAsAdmin(newSocket);
      newSocket.emit('getAllChatUsers');
    });

    newSocket.on('disconnect', () => {
      logger.debug('관리자 대시보드 연결 해제');
      setConnectionStatus('연결 해제됨');
    });

    newSocket.on('connect_error', (error) => {
      logger.error('관리자 대시보드 연결 오류:', error);
      setConnectionStatus('연결 오류');
    });

    newSocket.on('userJoined', (data) => {
      logger.debug('사용자 접속:', data.sender);
      addUser(data.sender);
    });

    newSocket.on('userDisconnected', (data) => {
      logger.debug('사용자 접속 해제:', data.sender);
      removeUser(data.sender);
    });

    newSocket.on('userMessage', (data: Message) => {
      logger.debug('사용자 메시지 수신:', data);

      setUsers((prev) => {
        const nextUsers = new Map(prev);
        const target = nextUsers.get(data.sender);
        nextUsers.set(data.sender, {
          username: data.sender,
          status: 'online',
          lastMessage: {
            content: data.content,
            timestamp: data.timestamp,
          },
          ...target,
        });
        return nextUsers;
      });

      if (currentUserRef.current !== data.sender) {
        setUnreadCounts((prev) => {
          const nextCounts = new Map(prev);
          const currentCount = nextCounts.get(data.sender) || 0;
          nextCounts.set(data.sender, currentCount + 1);
          return nextCounts;
        });
        showNotification(data.sender, data.content);
      } else {
        handleUserMessage(data);
      }
    });

    newSocket.on('adminReply', (data: Message) => {
      if (currentUserRef.current === data.recipient) {
        handleUserMessage(data);
      }
    });

    newSocket.on('chatHistory', (data) => {
      logger.debug('채팅 내역 수신:', data);
      if (data.userId === currentUserRef.current) {
        const sorted = (data.history || []).sort(
          (a: Message, b: Message) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        setMessages(sorted);
        setAllMessages((prev) => {
          const nextMessages = new Map(prev);
          nextMessages.set(data.userId, sorted);
          return nextMessages;
        });
      }
    });

    newSocket.on('allChatUsers', (chatUsers: unknown) => {
      logger.debug('모든 채팅 사용자 목록 수신:', chatUsers);
      if (Array.isArray(chatUsers)) {
        chatUsers.forEach((username) => {
          if (typeof username !== 'string') return;
          const fullUsername = normalizeUsername(username);
          if (fullUsername.includes('관리자') || fullUsername.includes('admin')) return;

          setUsers((prev) => {
            const nextUsers = new Map(prev);
            if (!nextUsers.has(fullUsername)) {
              nextUsers.set(fullUsername, {
                username: fullUsername,
                status: 'offline',
                lastMessage: undefined,
              });
            }
            return nextUsers;
          });

          newSocket.emit('getUserLastMessage', { userId: fullUsername });
        });
      } else {
        const testUsers = ['사용자_test1', '사용자_test2', '사용자_ljs4mu4jp'];
        testUsers.forEach((username) => {
          setUsers((prev) => {
            const nextUsers = new Map(prev);
            if (!nextUsers.has(username)) {
              nextUsers.set(username, {
                username,
                status: 'offline',
                lastMessage: {
                  content: '테스트 메시지',
                  timestamp: new Date().toISOString(),
                },
              });
            }
            return nextUsers;
          });
        });
      }
    });

    newSocket.on('userLastMessage', (data) => {
      logger.debug('사용자 최근 메시지 수신:', data);
      if (data.userId && data.lastMessage) {
        setUsers((prev) => {
          const nextUsers = new Map(prev);
          const target = nextUsers.get(data.userId);
          if (target) {
            nextUsers.set(data.userId, {
              ...target,
              lastMessage: {
                content: data.lastMessage.content,
                timestamp: data.lastMessage.timestamp,
              },
            });
          }
          return nextUsers;
        });
      }
    });

    setSocket(newSocket);

    if (canUseBrowserNotifications() && Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [addUser, handleUserMessage, joinAsAdmin, normalizeUsername, removeUser, showNotification, user?.id]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('chat_currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  useEffect(() => {
    if (allMessages.size > 0) {
      localStorage.setItem('chat_allMessages', JSON.stringify(Array.from(allMessages.entries())));
    }
  }, [allMessages]);

  const selectUser = (username: string) => {
    const fullUsername = normalizeUsername(username);
    logger.debug('사용자 선택:', { original: username, normalized: fullUsername });
    setCurrentUser(fullUsername);

    setUnreadCounts((prev) => {
      const nextCounts = new Map(prev);
      nextCounts.set(fullUsername, 0);
      return nextCounts;
    });

    setMessages([]);
    if (fullUsername && socket) {
      logger.debug('채팅 내역 요청 전송:', { userId: fullUsername, socketConnected: socket.connected });
      socket.emit('getHistory', { userId: fullUsername });
    } else {
      logger.warn('채팅 내역 요청 실패:', {
        fullUsername,
        socketExists: Boolean(socket),
        socketConnected: socket?.connected,
      });
    }
  };

  const backToUserList = () => {
    setCurrentUser(null);
    setMessages([]);
  };

  const calculateUnreadChatRooms = () => {
    let count = 0;
    unreadCounts.forEach((unreadCount) => {
      if (unreadCount > 0) count += 1;
    });
    return count;
  };

  const sendMessage = (content: string) => {
    if (!currentUser || !socket) return;

    socket.emit('sendMessage', {
      content,
      sender: '관리자',
      recipient: currentUser,
      type: 'CHAT',
      timestamp: new Date().toISOString(),
    });
  };

  const usersList = Array.from(users.values());
  const onlineCount = usersList.filter((chatUser) => chatUser.status === 'online').length;
  const offlineCount = usersList.filter((chatUser) => chatUser.status === 'offline').length;
  const waitingCount = calculateUnreadChatRooms();
  const connected = connectionStatus === '연결됨';

  return (
    <Page className="bg-slate-50 pb-4">
      <PageHeader>
        <PageHeaderContent className="justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <MessagesSquare className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-950">관리자 채팅 대시보드</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                {connected ? <Wifi className="size-4 text-emerald-600" /> : <WifiOff className="size-4 text-red-500" />}
                {connectionStatus}
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <Badge variant="success">{onlineCount} 온라인</Badge>
            <Badge variant={waitingCount > 0 ? 'default' : 'secondary'}>{waitingCount} 대기</Badge>
          </div>
        </PageHeaderContent>
      </PageHeader>

      <PageMain className={cn('grid gap-4', currentUser ? 'lg:grid-cols-[340px_1fr]' : 'max-w-4xl')}>
        <Card className={cn('border-white/80 bg-white shadow-sm', currentUser && 'hidden lg:block')}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3">
              <span>사용자 목록</span>
              <span className="text-sm font-medium text-muted-foreground">
                {onlineCount} 온라인 / {offlineCount} 오프라인
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {usersList.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
                <MessageCircle className="size-10 text-slate-300" />
                <p className="text-sm font-medium">아직 채팅할 사용자가 없습니다.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {usersList.map((chatUser) => {
                  const unreadCount = unreadCounts.get(chatUser.username) ?? 0;
                  return (
                    <Button
                      key={chatUser.username}
                      type="button"
                      variant="ghost"
                      className={cn(
                        'h-auto w-full justify-start rounded-none px-4 py-3 text-left',
                        currentUser === chatUser.username && 'bg-primary/5',
                      )}
                      onClick={() => selectUser(chatUser.username)}
                    >
                      <div className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                        {chatUser.username.charAt(0)}
                        {chatUser.status === 'online' && (
                          <span className="absolute bottom-0 right-0 size-3 rounded-full border-2 border-white bg-emerald-500" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-950">{chatUser.username}</span>
                          <span className={cn('text-xs', chatUser.status === 'online' ? 'text-emerald-600' : 'text-muted-foreground')}>
                            {chatUser.status === 'online' ? '온라인' : '오프라인'}
                          </span>
                        </div>
                        <div className="mt-1 truncate text-xs text-muted-foreground">
                          {chatUser.lastMessage?.content || '메시지 없음'}
                        </div>
                      </div>
                      {unreadCount > 0 && <Badge>{unreadCount}</Badge>}
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {currentUser ? (
          <ChatRoom currentUser={currentUser} messages={messages} onSendMessage={sendMessage} onBack={backToUserList} />
        ) : (
          <Card className="hidden min-h-[560px] items-center justify-center border-dashed border-slate-200 bg-white shadow-sm lg:flex">
            <CardContent className="flex flex-col items-center gap-3 text-center text-muted-foreground">
              <MessagesSquare className="size-12 text-slate-300" />
              <p className="text-sm font-medium">왼쪽 목록에서 사용자를 선택하면 대화를 볼 수 있습니다.</p>
            </CardContent>
          </Card>
        )}
      </PageMain>
      <NavigationBar />
    </Page>
  );
};

export default ChatDashboard;
