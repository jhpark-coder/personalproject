import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationGateway } from './communication.gateway';
import { ChatService } from '../chat/chat.service';
import { Server, Socket } from 'socket.io';
import { ChatMessageDto, ChatUserDto } from '../chat/dto/chat-message.dto';
import { JwtAuthService } from '../shared/auth/jwt-auth.service';

describe('CommunicationGateway', () => {
  let gateway: CommunicationGateway;
  let chatService: ChatService;
  let jwtAuthService: JwtAuthService;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;
  let emitMock: jest.Mock;
  const userIdentity = { userId: '1', roles: ['ROLE_USER'] };
  const adminIdentity = { userId: '1', roles: ['ROLE_ADMIN'] };

  beforeEach(async () => {
    emitMock = jest.fn();
    const emitObj = { emit: emitMock };
    mockServer = {
      to: jest.fn().mockReturnValue(emitObj),
      emit: emitMock,
    } as any;

    mockSocket = {
      id: 'test-socket-id',
      handshake: {
        auth: {
          token: 'token',
        },
        headers: {},
        time: new Date().toISOString(),
        address: '127.0.0.1',
        xdomain: false,
        secure: false,
        issued: Date.now(),
        url: '/',
        query: {},
      },
      data: { auth: userIdentity },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommunicationGateway,
        {
          provide: ChatService,
          useValue: {
            saveMessage: jest.fn(),
            getChatHistory: jest.fn(),
            getAllChatUsers: jest.fn(),
            getUserLastMessage: jest.fn(),
            addOnlineUser: jest.fn(),
            removeOnlineUserBySocketId: jest.fn(),
            getOnlineUsers: jest.fn(),
          },
        },
        {
          provide: JwtAuthService,
          useValue: {
            getSocketIdentity: jest.fn().mockReturnValue(userIdentity),
            isAdmin: jest
              .fn()
              .mockImplementation((identity) =>
                Boolean(identity?.roles?.includes('ROLE_ADMIN')),
              ),
          },
        },
      ],
    }).compile();

    gateway = module.get<CommunicationGateway>(CommunicationGateway);
    chatService = module.get<ChatService>(ChatService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);

    // WebSocketServer 데코레이터로 인해 수동으로 설정
    (gateway as any).server = mockServer;
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should handle user connection correctly', () => {
      // given
      const mockSocket = {
        id: 'test-socket-id',
        handshake: {
          auth: {
            token: 'token',
          },
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;

      // when
      gateway.handleConnection(mockSocket);

      // then
      expect(mockSocket.join).toHaveBeenCalledWith('1');
    });

    it('should handle admin connection correctly', () => {
      // given
      const mockSocket = {
        id: 'admin-socket-id',
        handshake: {
          auth: {
            token: 'token',
          },
        },
        data: {},
        join: jest.fn(),
        disconnect: jest.fn(),
      } as any;
      jest
        .spyOn(jwtAuthService, 'getSocketIdentity')
        .mockReturnValueOnce(adminIdentity);

      // when
      gateway.handleConnection(mockSocket);

      // then
      expect(mockSocket.join).toHaveBeenCalledWith('1');
      expect(mockSocket.join).toHaveBeenCalledWith('admin');
      expect(mockServer.emit).toHaveBeenCalledWith('adminOnline');
    });
  });

  describe('handleDisconnect', () => {
    it('should handle user disconnect correctly', () => {
      // given
      const mockSocket = {
        id: 'test-socket-id',
        data: { auth: userIdentity },
      } as any;

      jest
        .spyOn(chatService, 'removeOnlineUserBySocketId')
        .mockReturnValue('testUser');

      // when
      gateway.handleDisconnect(mockSocket);

      // then
      expect(chatService.removeOnlineUserBySocketId).toHaveBeenCalledWith(
        'test-socket-id',
      );
      expect(mockServer.to).toHaveBeenCalledWith('admin');
    });

    it('should handle admin disconnect correctly', () => {
      // given
      const mockSocket = {
        id: 'admin-socket-id',
        data: { auth: adminIdentity },
      } as any;

      // when
      gateway.handleDisconnect(mockSocket);

      // then
      expect(mockServer.emit).toHaveBeenCalledWith('adminOffline');
    });
  });

  describe('handleJoinChat', () => {
    it('should handle join chat correctly', async () => {
      // given
      const data: ChatUserDto = {
        sender: 'testUser',
        type: 'JOIN',
      };

      jest.spyOn(chatService, 'addOnlineUser').mockImplementation();

      // when
      const result = await gateway.handleJoinChat(data, mockSocket as Socket);

      // then
      expect(mockSocket.join).toHaveBeenCalledWith('사용자_1');
      expect(chatService.addOnlineUser).toHaveBeenCalledWith(
        '사용자_1',
        'test-socket-id',
      );
      expect(result).toEqual({ status: 'joined', user: '사용자_1' });
    });
  });

  describe('handleSendMessage', () => {
    it('should handle user message correctly', async () => {
      // given
      const data: ChatMessageDto = {
        sender: 'testUser',
        content: 'Hello',
        type: 'CHAT',
        recipient: null,
      };

      const savedMessage = { ...data, id: 'msg-1', timestamp: new Date() };
      jest
        .spyOn(chatService, 'saveMessage')
        .mockResolvedValue(savedMessage as any);

      // when
      const result = await gateway.handleSendMessage(
        data,
        mockSocket as Socket,
      );

      // then
      expect(chatService.saveMessage).toHaveBeenCalledWith({
        ...data,
        sender: '사용자_1',
        recipient: null,
      });
      expect(result).toEqual({ ...savedMessage, isAdmin: false });
    });

    it('should handle admin reply correctly', async () => {
      // given
      const data: ChatMessageDto = {
        sender: '관리자',
        content: 'Reply',
        type: 'CHAT',
        recipient: 'testUser',
      };

      const adminSocket = {
        ...(mockSocket as object),
        data: { auth: adminIdentity },
      } as Socket;
      const savedMessage = { ...data, id: 'msg-1', timestamp: new Date() };
      jest
        .spyOn(chatService, 'saveMessage')
        .mockResolvedValue(savedMessage as any);

      // when
      const result = await gateway.handleSendMessage(data, adminSocket);

      // then
      expect(chatService.saveMessage).toHaveBeenCalledWith(data);
      expect(result).toEqual({ ...savedMessage, isAdmin: true });
    });
  });

  describe('handleGetHistory', () => {
    it('should get chat history correctly', async () => {
      // given
      const data = { userId: '1' };
      const history = [
        { id: '1', content: 'Hello', timestamp: new Date() },
        { id: '2', content: 'Hi', timestamp: new Date() },
      ];

      jest
        .spyOn(chatService, 'getChatHistory')
        .mockResolvedValue(history as any);

      // when
      await gateway.handleGetHistory(data, mockSocket as Socket);

      // then
      expect(chatService.getChatHistory).toHaveBeenCalledWith('1');
      expect(mockSocket.emit).toHaveBeenCalledWith('chatHistory', {
        userId: '1',
        history,
      });
    });
  });

  describe('notification methods', () => {
    it('should send notification to user', () => {
      // given
      const userId = '1';
      const notification = {
        senderUserId: 99,
        targetUserId: 1,
        message: 'Test notification',
        type: 'admin_message',
        category: 'ADMIN',
        isRead: false,
      };

      // when
      gateway.sendNotificationToUser(userId, notification);

      // then
      expect(mockServer.to).toHaveBeenCalledWith('1');
    });

    it('should send notification to admin group', () => {
      // given
      const notification = {
        senderUserId: 99,
        targetUserId: 1,
        message: 'Admin notification',
        type: 'admin_message',
        category: 'ADMIN',
        isRead: false,
      };

      // when
      gateway.sendNotificationToAdminGroup(notification);

      // then
      expect(mockServer.to).toHaveBeenCalledWith('admin');
    });

    it('should broadcast notification', () => {
      // given
      const notification = {
        senderUserId: 99,
        targetUserId: 1,
        message: 'Broadcast notification',
        type: 'admin_message',
        category: 'ADMIN',
        isRead: false,
      };

      // when
      gateway.broadcastNotification(notification);

      // then
      expect(mockServer.emit).toHaveBeenCalledWith(
        'broadcastNotification',
        notification,
      );
    });
  });
});
