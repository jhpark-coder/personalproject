import { Test, TestingModule } from '@nestjs/testing';
import { CommunicationGateway } from './communication.gateway';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Server, Socket } from 'socket.io';
import { ChatMessageDto, ChatUserDto } from '../chat/dto/chat-message.dto';

describe('CommunicationGateway', () => {
  let gateway: CommunicationGateway;
  let chatService: ChatService;
  let notificationsService: NotificationsService;
  let mockServer: Partial<Server>;
  let mockSocket: Partial<Socket>;
  let emitMock: jest.Mock;

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
          userId: 1,
          roles: ['ROLE_USER'],
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
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
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
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
            getUserNotifications: jest.fn(),
            markAsRead: jest.fn(),
            getUnreadCount: jest.fn(),
          },
        },
      ],
    }).compile();

    gateway = module.get<CommunicationGateway>(CommunicationGateway);
    chatService = module.get<ChatService>(ChatService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);

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
            userId: 1,
            roles: ['ROLE_USER'],
          },
        },
        join: jest.fn(),
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
            userId: 1,
            roles: ['ROLE_ADMIN'],
          },
        },
        join: jest.fn(),
      } as any;

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
        handshake: {
          auth: {
            userId: 1,
            roles: ['ROLE_USER'],
          },
        },
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
        handshake: {
          auth: {
            userId: 1,
            roles: ['ROLE_ADMIN'],
          },
        },
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
      expect(mockSocket.join).toHaveBeenCalledWith('testUser');
      expect(chatService.addOnlineUser).toHaveBeenCalledWith(
        'testUser',
        'test-socket-id',
      );
      expect(result).toEqual({ status: 'joined', user: 'testUser' });
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
      expect(chatService.saveMessage).toHaveBeenCalledWith(data);
      expect(result).toEqual(savedMessage);
    });

    it('should handle admin reply correctly', async () => {
      // given
      const data: ChatMessageDto = {
        sender: '관리자',
        content: 'Reply',
        type: 'CHAT',
        recipient: 'testUser',
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
      expect(chatService.saveMessage).toHaveBeenCalledWith(data);
      expect(result).toEqual(savedMessage);
    });
  });

  describe('handleGetHistory', () => {
    it('should get chat history correctly', async () => {
      // given
      const data = { userId: 'testUser' };
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
      expect(chatService.getChatHistory).toHaveBeenCalledWith('testUser');
      expect(mockSocket.emit).toHaveBeenCalledWith('chatHistory', {
        userId: 'testUser',
        history,
      });
    });
  });

  describe('notification methods', () => {
    it('should send notification to user', () => {
      // given
      const userId = '1';
      const notification = { id: '1', message: 'Test notification' };

      // when
      gateway.sendNotificationToUser(userId, notification);

      // then
      expect(mockServer.to).toHaveBeenCalledWith('1');
    });

    it('should send notification to admin group', () => {
      // given
      const notification = { id: '1', message: 'Admin notification' };

      // when
      gateway.sendNotificationToAdminGroup(notification);

      // then
      expect(mockServer.to).toHaveBeenCalledWith('admin');
    });

    it('should broadcast notification', () => {
      // given
      const notification = { id: '1', message: 'Broadcast notification' };

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
