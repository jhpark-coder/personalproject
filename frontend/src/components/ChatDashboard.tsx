import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import UserList from './UserList';
import ChatRoom from './ChatRoom';
import ChatStats from './ChatStats';
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
  // const [allMessages, setAllMessages] = useState<Map<string, Message[]>>(new Map());
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const [connectionStatus, setConnectionStatus] = useState('연결 중...');
  const currentUserRef = useRef(currentUser);

  // 새로고침 시 저장된 데이터 복원
  useEffect(() => {
    const savedCurrentUser = localStorage.getItem('chat_currentUser');
    // const savedAllMessages = localStorage.getItem('chat_allMessages');
    
    if (savedCurrentUser && savedCurrentUser !== 'null') {
      const parsedUser = JSON.parse(savedCurrentUser);
      setCurrentUser(parsedUser);
      console.log('🔄 복원된 현재 사용자:', parsedUser);
    }
    // if (savedAllMessages) {
    //   setAllMessages(new Map(JSON.parse(savedAllMessages)));
    // }
  }, []);

  useEffect(() => {
    // Socket.IO 연결 (관리자 권한으로)
    const newSocket = io('http://localhost:3000', {
      auth: {
        userId: 1, // 관리자 ID
        roles: ['ROLE_ADMIN'] // 관리자 역할
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
      addUser(data.sender);
    });

    newSocket.on('userDisconnected', (data) => {
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
      if (data.userId === currentUserRef.current) {
        const sorted = (data.history || []).sort((a: Message, b: Message) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
        setMessages(sorted);

        // DB에서 받은 데이터로 allMessages 업데이트
        // setAllMessages(prev => {
        //   const newMessages = new Map(prev);
        //   newMessages.set(data.userId, sorted);
        //   return newMessages;
        // });
      }
    });

    // 모든 채팅 사용자 목록 수신
    newSocket.on('allChatUsers', (users) => {
      console.log('📨 모든 채팅 사용자 목록 수신:', users);
      if (users && Array.isArray(users)) {
        users.forEach(username => {
          const fullUsername = normalizeUsername(username);
          // 관리자는 사용자 목록에서 제외
          if (!fullUsername.includes('관리자')) {
            setUsers(prev => {
              const newUsers = new Map(prev);
              if (!newUsers.has(fullUsername)) {
                newUsers.set(fullUsername, {
                  username: fullUsername,
                  status: 'offline',
                  lastMessage: undefined
                });
              }
              return newUsers;
            });
          }
        });
        
        // 각 사용자의 최근 메시지 정보 요청 (관리자 제외)
        users.forEach(username => {
          const fullUsername = normalizeUsername(username);
          if (!fullUsername.includes('관리자')) {
            newSocket.emit('getUserLastMessage', { userId: fullUsername });
          }
        });
      }
    });

    // 사용자 최근 메시지 수신
    newSocket.on('userLastMessage', (data) => {
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
  }, []);

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

  const joinAsAdmin = (socket: Socket) => {
    socket.emit('joinAsAdmin', {
      sender: '관리자',
      type: 'JOIN'
    });
  };

  const normalizeUsername = (username: string) => {
    return username.startsWith('사용자_') ? username : `사용자_${username}`;
  };

  const addUser = (username: string) => {
    const fullUsername = normalizeUsername(username);
    setUsers(prev => {
      const newUsers = new Map(prev);
      if (!newUsers.has(fullUsername)) {
        newUsers.set(fullUsername, {
          username: fullUsername,
          status: 'online',
          lastMessage: undefined
        });
      } else {
        // 기존 사용자가 있으면 온라인으로 업데이트
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
  };

  const removeUser = (username: string) => {
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
  };

  const handleUserMessage = (data: Message) => {
    setMessages(prev => [...prev, data]);
  };

  const selectUser = (username: string) => {
    const fullUsername = normalizeUsername(username);
    setCurrentUser(fullUsername);
    
    // localStorage에 현재 사용자 저장
    localStorage.setItem('chat_currentUser', JSON.stringify(fullUsername));

    // 채팅방 진입 시 안읽은 메시지 수 리셋
    setUnreadCounts(prev => {
      const newCounts = new Map(prev);
      newCounts.set(fullUsername, 0);
      return newCounts;
    });

    // DB에서 최신 데이터를 가져오도록
    setMessages([]);
    if (fullUsername && socket) {
      socket.emit('getHistory', { userId: fullUsername });
    }
  };

  const backToUserList = () => {
    setCurrentUser(null);
    setMessages([]);
    // localStorage에서 현재 사용자 제거
    localStorage.removeItem('chat_currentUser');
  };

  // 안읽은 채팅방 수 계산
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
  };

  const showNotification = (sender: string, content: string) => {
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

    // 탭 제목 변경
    const originalTitle = document.title;
    document.title = `[새 메시지] ${originalTitle}`;
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  return (
    <div className="chat-dashboard">
      {/* 헤더 */}
      <div className="chat-header">
        <div>
          <h4 className="mb-0">
            <i className="fas fa-comments"></i>
            관리자 채팅 대시보드
          </h4>
          <small className={`text-${connectionStatus === '연결됨' ? 'success' : 'danger'}`}>
            {connectionStatus}
          </small>
        </div>
        <ChatStats
          onlineUsers={Array.from(users.values()).filter(user => user.status === 'online').length}
          totalMessages={calculateUnreadChatRooms()}
        />
      </div>

      {/* 메인 영역 */}
      <div className="chat-main">
        {/* 사용자 목록 */}
        <UserList
          users={Array.from(users.values())}
          currentUser={currentUser}
          onSelectUser={selectUser}
          unreadCounts={unreadCounts}
        />

        {/* 채팅 영역 */}
        <ChatRoom
          currentUser={currentUser}
          messages={messages}
          onSendMessage={sendMessage}
          onBackToUserList={backToUserList}
        />
      </div>
    </div>
  );
};

export default ChatDashboard; 