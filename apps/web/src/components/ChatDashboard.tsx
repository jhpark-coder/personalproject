import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CHAT_SERVER_URL } from '../config/api';
import ChatRoom from './ChatRoom';
import './ChatDashboard.css';

interface User {
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
}

const ChatDashboard: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allMessages, setAllMessages] = useState<Map<string, Message[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const currentUserRef = useRef(currentUser);

  const joinAsAdmin = useCallback((nextSocket: Socket) => {
    nextSocket.emit('joinAsAdmin', {
      sender: '관리자',
      type: 'JOIN'
    });
  }, []);

  const normalizeUsername = useCallback((username: string) => {
    return username.startsWith('사용자_') ? username : `사용자_${username}`;
  }, []);

  const addUser = useCallback((username: string) => {
    const fullUsername = normalizeUsername(username);
    
    if (fullUsername.includes('관리자') || fullUsername.includes('admin')) {
      console.log('🚫 관리자 사용자 목록에서 제외:', fullUsername);
      return;
    }
    
    setUsers(prev => {
      const newUsers = new Map(prev);
      if (!newUsers.has(fullUsername)) {
        newUsers.set(fullUsername, {
          username: fullUsername,
          status: 'online',
          lastMessage: undefined
        });
      } else {
        const existingUser = newUsers.get(fullUsername);
        if (existingUser) {
          newUsers.set(fullUsername, {
            ...existingUser,
            status: 'online'
          });
        }
      }
      return newUsers;
    });
  }, [normalizeUsername]);

  const removeUser = useCallback((username: string) => {
    setUsers(prev => {
      const newUsers = new Map(prev);
      const user = newUsers.get(username);
      if (user) {
        newUsers.set(username, {
          ...user,
          status: 'offline'
        });
      }
      return newUsers;
    });
  }, []);

  const handleUserMessage = useCallback((data: Message) => {
    setMessages(prev => [...prev, data]);
  }, []);

  const showNotification = useCallback((sender: string, content: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(`새 메시지: ${sender}`, {
        body: content,
        icon: '/favicon.ico',
        requireInteraction: false,
        silent: true
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

  // 새로고침 시 저장된 데이터 복원
  useEffect(() => {
    const savedCurrentUser = localStorage.getItem('chat_currentUser');
    const savedAllMessages = localStorage.getItem('chat_allMessages');
    
    if (savedCurrentUser && savedCurrentUser !== 'null') {
      const parsedUser = JSON.parse(savedCurrentUser);
      setCurrentUser(parsedUser);
      console.log('🔄 복원된 현재 사용자:', parsedUser);
    }
    if (savedAllMessages) {
      setAllMessages(new Map(JSON.parse(savedAllMessages)));
    }
    
    // 기존 사용자 목록에서 관리자 제거
    setUsers(prev => {
      const newUsers = new Map(prev);
      for (const [username] of newUsers.entries()) {
        if (username.includes('관리자') || username.includes('admin')) {
          console.log('🚫 기존 관리자 사용자 제거:', username);
          newUsers.delete(username);
        }
      }
      return newUsers;
    });
  }, []);

  useEffect(() => {
    // Socket.IO 연결 (관리자 권한으로)
    const url = (CHAT_SERVER_URL && CHAT_SERVER_URL.trim().length > 0) ? CHAT_SERVER_URL : undefined;
    const newSocket = url
      ? io(url, {
          transports: ['websocket', 'polling'],
          auth: {
            userId: 1,
            roles: ['ROLE_ADMIN']
          }
        })
      : io({
          transports: ['websocket', 'polling'],
          auth: {
            userId: 1,
            roles: ['ROLE_ADMIN']
          }
        });

    newSocket.on('connect', () => {
      console.log('✅ 관리자 대시보드 연결 성공');
      setConnectionStatus('연결됨');
      joinAsAdmin(newSocket);
      
      // 연결 성공 후 DB에서 모든 채팅 사용자 목록 요청
      console.log('📤 모든 채팅 사용자 목록 요청');
      newSocket.emit('getAllChatUsers');
    });

    newSocket.on('disconnect', () => {
      console.log('🔗 관리자 대시보드 연결 해제');
      setConnectionStatus('연결 해제됨');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ 관리자 대시보드 연결 오류:', error);
      setConnectionStatus('연결 오류');
    });

    // 사용자 관련 이벤트
    newSocket.on('userJoined', (data) => {
      console.log('👤 사용자 접속:', data.sender);
      addUser(data.sender);
    });

    newSocket.on('userDisconnected', (data) => {
      console.log('👤 사용자 접속 해제:', data.sender);
      removeUser(data.sender);
    });

    // 메시지 관련 이벤트
    newSocket.on('userMessage', (data) => {
      console.log('📨 사용자 메시지 수신:', data);
      
      // 사용자 목록에 최근 메시지 정보 업데이트
      setUsers(prev => {
        const newUsers = new Map(prev);
        const user = newUsers.get(data.sender);
        if (user) {
          newUsers.set(data.sender, {
            ...user,
            status: 'online', // 메시지를 보낸 사용자는 온라인
            lastMessage: {
              content: data.content,
              timestamp: data.timestamp
            }
          });
        } else {
          // 사용자가 목록에 없으면 추가
          newUsers.set(data.sender, {
            username: data.sender,
            status: 'online',
            lastMessage: {
              content: data.content,
              timestamp: data.timestamp
            }
          });
        }
        return newUsers;
      });

      // 안읽은 메시지 수 업데이트 (현재 선택된 사용자가 아닌 경우에만)
      if (currentUserRef.current !== data.sender) {
        setUnreadCounts(prev => {
          const newCounts = new Map(prev);
          const currentCount = newCounts.get(data.sender) || 0;
          newCounts.set(data.sender, currentCount + 1);
          return newCounts;
        });

        // 알림 표시
        showNotification(data.sender, data.content);
      } else {
        // 현재 선택된 사용자의 메시지라면 채팅방에 표시
        handleUserMessage(data);
      }
    });

    // 관리자 응답 수신 (관리자가 보낸 메시지)
    newSocket.on('adminReply', (data) => {
      if (currentUserRef.current === data.recipient) {
        handleUserMessage(data);
      }
    });

    // 채팅 내역 수신
    newSocket.on('chatHistory', (data) => {
      console.log('📨 채팅 내역 수신:', data);
      console.log('🔍 현재 선택된 사용자:', currentUserRef.current);
      if (data.userId === currentUserRef.current) {
        console.log('✅ 현재 사용자와 일치하는 채팅 내역:', data.userId);
        const sorted = (data.history || []).sort((a: Message, b: Message) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        console.log('📋 정렬된 채팅 내역:', sorted);
        setMessages(sorted);

        // DB에서 받은 데이터로 allMessages 업데이트 (중복 방지)
        setAllMessages(prev => {
          const newMessages = new Map(prev);
          newMessages.set(data.userId, sorted);
          return newMessages;
        });
      } else {
        console.log('❌ 현재 사용자와 일치하지 않는 채팅 내역:', {
          receivedUserId: data.userId,
          currentUser: currentUserRef.current
        });
      }
    });

    // 모든 채팅 사용자 목록 수신 (새로고침 시 DB에서 복원)
    newSocket.on('allChatUsers', (users) => {
      console.log('📨 모든 채팅 사용자 목록 수신:', users);
      if (users && Array.isArray(users)) {
        // DB에서 가져온 사용자들을 오프라인 상태로 추가 (관리자 제외)
        users.forEach(username => {
          const fullUsername = normalizeUsername(username);
          
          // 관리자는 사용자 목록에서 제외
          if (fullUsername.includes('관리자') || fullUsername.includes('admin')) {
            console.log('🚫 관리자 사용자 목록에서 제외:', fullUsername);
            return;
          }
          
          setUsers(prev => {
            const newUsers = new Map(prev);
            if (!newUsers.has(fullUsername)) {
              newUsers.set(fullUsername, {
                username: fullUsername,
                status: 'offline', // DB에서 가져온 사용자는 기본적으로 오프라인
                lastMessage: undefined
              });
            }
            return newUsers;
          });
        });
        console.log('✅ DB에서 사용자 목록 복원 완료');
        
        // 각 사용자의 최근 메시지 정보 요청 (관리자 제외)
        users.forEach(username => {
          const fullUsername = normalizeUsername(username);
          
          // 관리자는 메시지 요청에서도 제외
          if (fullUsername.includes('관리자') || fullUsername.includes('admin')) {
            return;
          }
          
          console.log('📤 사용자 최근 메시지 요청:', fullUsername);
          newSocket.emit('getUserLastMessage', { userId: fullUsername });
        });
      } else {
        console.log('⚠️ DB에서 사용자 목록을 가져오지 못함, 테스트 데이터 사용');
        // 테스트용 하드코딩된 사용자 목록 (DB 연결 실패 시)
        const testUsers = ['사용자_test1', '사용자_test2', '사용자_ljs4mu4jp'];
        testUsers.forEach(username => {
          setUsers(prev => {
            const newUsers = new Map(prev);
            if (!newUsers.has(username)) {
              newUsers.set(username, {
                username: username,
                status: 'offline',
                lastMessage: {
                  content: '테스트 메시지',
                  timestamp: new Date().toISOString()
                }
              });
            }
            return newUsers;
          });
        });
      }
    });

    // 사용자 최근 메시지 수신
    newSocket.on('userLastMessage', (data) => {
      console.log('📨 사용자 최근 메시지 수신:', data);
      if (data.userId && data.lastMessage) {
        setUsers(prev => {
          const newUsers = new Map(prev);
          const user = newUsers.get(data.userId);
          if (user) {
            newUsers.set(data.userId, {
              ...user,
              lastMessage: {
                content: data.lastMessage.content,
                timestamp: data.lastMessage.timestamp
              }
            });
          }
          return newUsers;
        });
      }
    });

    setSocket(newSocket);

    // 알림 권한 요청
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      newSocket.disconnect();
    };
  }, [addUser, handleUserMessage, joinAsAdmin, normalizeUsername, removeUser, showNotification]);

  // currentUser가 변경될 때마다 ref 업데이트
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // 현재 사용자가 변경될 때 로컬 스토리지에 저장
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('chat_currentUser', JSON.stringify(currentUser));
    }
  }, [currentUser]);

  // allMessages가 변경될 때 로컬 스토리지에 저장
  useEffect(() => {
    if (allMessages.size > 0) {
      localStorage.setItem('chat_allMessages', JSON.stringify(Array.from(allMessages.entries())));
    }
  }, [allMessages]);

  const selectUser = (username: string) => {
    const fullUsername = normalizeUsername(username);
    console.log('👤 사용자 선택:', { original: username, normalized: fullUsername });
    setCurrentUser(fullUsername);

    // 채팅방 진입 시 안읽은 메시지 수 리셋 (읽음 처리)
    setUnreadCounts(prev => {
      const newCounts = new Map(prev);
      newCounts.set(fullUsername, 0);
      return newCounts;
    });

    // 항상 DB에서 최신 데이터를 가져오도록 수정
    setMessages([]); // 로딩 상태 표시
    if (fullUsername && socket) {
      console.log('📤 채팅 내역 요청 전송:', { userId: fullUsername, socketConnected: socket.connected });
      socket.emit('getHistory', { userId: fullUsername });
    } else {
      console.warn('⚠️ 채팅 내역 요청 실패:', {
        fullUsername,
        socketExists: !!socket,
        socketConnected: socket?.connected
      });
    }
  };

  const backToUserList = () => {
    setCurrentUser(null);
    setMessages([]);
  };

  // 안읽은 채팅방 수 계산 (상담 대기 중인 고객 수)
  const calculateUnreadChatRooms = () => {
    let count = 0;
    unreadCounts.forEach((unreadCount) => {
      if (unreadCount > 0) {
        count++;
      }
    });
    return count;
  };

  const sendMessage = (content: string) => {
    if (!currentUser || !socket) return;

    const messageData = {
      content,
      sender: '관리자',
      recipient: currentUser,
      type: 'CHAT',
      timestamp: new Date().toISOString()
    };

    socket.emit('sendMessage', messageData);
    // 메시지는 서버에서 DB 저장 후 다시 받아서 표시되므로 여기서는 추가하지 않음
  };

  return (
    <div className="chat-dashboard">
      {/* 헤더 */}
      <div className="dashboard-header content-wrapper">
        <div className="header-left">
          <div className="chat-icon">💬</div>
          <div className="header-text">
            <div className="dashboard-title">관리자 채팅 대시보드</div>
            <div className="connection-status">{connectionStatus}</div>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-box">
            <span className="stat-number">{Array.from(users.values()).filter(user => user.status === 'online').length}</span>
            <span className="stat-label">온라인</span>
          </div>
          <div className="stat-box">
            <span className="stat-number">{calculateUnreadChatRooms()}</span>
            <span className="stat-label">대기</span>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 */}
      <div className="dashboard-content content-wrapper">
        {!currentUser ? (
          // 채팅 목록 화면 (카카오톡 스타일)
          <div className="chat-list-view">
            <div className="chat-list-header">
              <h2>사용자 목록 ({Array.from(users.values()).filter(user => user.status === 'online').length} 온라인, {Array.from(users.values()).filter(user => user.status === 'offline').length} 오프라인)</h2>
            </div>
            
            <div className="chat-list">
              {Array.from(users.values()).length === 0 ? (
                <div className="empty-chat-list">
                  <div className="empty-icon">💬</div>
                  <div className="empty-text">아직 채팅할 사용자가 없습니다</div>
                </div>
              ) : (
                Array.from(users.values()).map((user) => (
                  <div
                    key={user.username}
                    className={`chat-item ${user.status === 'online' ? 'online' : 'offline'}`}
                    onClick={() => selectUser(user.username)}
                  >
                    <div className="chat-item-avatar">
                      <div className="avatar-circle">
                        <span className="avatar-text">{user.username.charAt(0)}</span>
                      </div>
                      {user.status === 'online' && <div className="online-indicator"></div>}
                    </div>
                    
                    <div className="chat-item-content">
                      <div className="chat-item-header">
                        <span className="chat-item-name">{user.username}</span>
                        <span className="chat-item-status">
                          {user.status === 'online' ? '(온라인)' : '(오프라인)'}
                        </span>
                      </div>
                      
                      {user.lastMessage ? (
                        <div className="chat-item-message">
                          {user.lastMessage.content.length > 20 
                            ? user.lastMessage.content.substring(0, 20) + '...' 
                            : user.lastMessage.content}
                        </div>
                      ) : (
                        <div className="chat-item-message no-message">메시지 없음</div>
                      )}
                    </div>
                    
                    {(unreadCounts.get(user.username) ?? 0) > 0 && (
                      <div className="unread-badge">
                        {unreadCounts.get(user.username) ?? 0}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          // 채팅방 화면 (전체 화면)
          <div className="chat-room-view">
            <ChatRoom
              currentUser={currentUser}
              messages={messages}
              onSendMessage={sendMessage}
              onBack={backToUserList}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatDashboard; 
