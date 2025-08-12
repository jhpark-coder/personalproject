import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ChatService } from './chat.service';
import { ChatMessage } from '../schemas/chat-message.schema';
import { ChatMessageDto, ChatMessageType } from './dto/chat-message.dto';

describe('ChatService', () => {
  let service: ChatService;
  let mockChatMessageModel: any;

  beforeEach(async () => {
    const mockMessage = {
      save: jest.fn().mockResolvedValue({
        toObject: () => ({ sender: 'test', content: 'test' }),
      }),
    };

    mockChatMessageModel = jest.fn().mockImplementation(() => mockMessage);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatMessage.name),
          useValue: mockChatMessageModel,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveMessage', () => {
    it('should save message correctly', async () => {
      // given
      const messageData: ChatMessageDto = {
        sender: 'testUser',
        content: '안녕하세요!',
        type: 'CHAT' as ChatMessageType,
        recipient: null,
      };

      // when
      const savedMessage = await service.saveMessage(messageData);

      // then
      expect(mockChatMessageModel).toHaveBeenCalledWith({
        ...messageData,
        timestamp: expect.any(Date),
      });
    });

    it('should save admin reply correctly', async () => {
      // given
      const messageData: ChatMessageDto = {
        sender: 'admin',
        content: '답장입니다.',
        type: 'CHAT' as ChatMessageType,
        recipient: 'user123',
      };

      // when
      const savedMessage = await service.saveMessage(messageData);

      // then
      expect(mockChatMessageModel).toHaveBeenCalledWith({
        ...messageData,
        timestamp: expect.any(Date),
      });
    });

    it('should save join message correctly', async () => {
      // given
      const messageData: ChatMessageDto = {
        sender: 'newUser',
        content: 'newUser 님이 문의를 시작했습니다.',
        type: 'JOIN' as ChatMessageType,
        recipient: null,
      };

      // when
      const savedMessage = await service.saveMessage(messageData);

      // then
      expect(mockChatMessageModel).toHaveBeenCalledWith({
        ...messageData,
        timestamp: expect.any(Date),
      });
    });
  });

  describe('getChatHistory', () => {
    it('should return empty array for new user', async () => {
      // given
      const userId = 'newUser';
      const mockHistory = [];

      mockChatMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockHistory),
        }),
      });

      // when
      const history = await service.getChatHistory(userId);

      // then
      expect(history).toEqual([]);
    });

    it('should return chat history for user with messages', async () => {
      // given
      const user1 = 'user1';
      const mockHistory = [
        {
          sender: user1,
          content: '첫 번째 메시지',
          toObject: () => ({ sender: user1, content: '첫 번째 메시지' }),
        },
        {
          sender: user1,
          content: '두 번째 메시지',
          toObject: () => ({ sender: user1, content: '두 번째 메시지' }),
        },
      ];

      mockChatMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockHistory),
        }),
      });

      // when
      const user1History = await service.getChatHistory(user1);

      // then
      expect(user1History).toHaveLength(2);
      expect(user1History[0].sender).toBe(user1);
      expect(user1History[1].sender).toBe(user1);
    });
  });

  describe('getAllMessages', () => {
    it('should return all messages for admin', async () => {
      // given
      const mockMessages = [
        {
          sender: 'user1',
          content: '사용자 1 메시지',
          toObject: () => ({ sender: 'user1', content: '사용자 1 메시지' }),
        },
        {
          sender: 'user2',
          content: '사용자 2 메시지',
          toObject: () => ({ sender: 'user2', content: '사용자 2 메시지' }),
        },
      ];

      mockChatMessageModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockMessages),
        }),
      });

      // when
      const allMessages = await service.getAllMessages();

      // then
      expect(allMessages.length).toBeGreaterThanOrEqual(2);
      expect(allMessages.some((msg) => msg.sender === 'user1')).toBe(true);
      expect(allMessages.some((msg) => msg.sender === 'user2')).toBe(true);
    });
  });

  describe('clearHistory', () => {
    it('should clear chat history for specific user', async () => {
      // given
      const user = 'testUser';
      mockChatMessageModel.deleteMany = jest.fn().mockResolvedValue({});

      // when
      await service.clearHistory(user);

      // then
      expect(mockChatMessageModel.deleteMany).toHaveBeenCalledWith({
        $or: [{ sender: user }, { recipient: user }],
      });
    });
  });
});
