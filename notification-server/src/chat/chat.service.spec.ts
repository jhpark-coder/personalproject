import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { ChatMessageDto, ChatMessageType } from './dto/chat-message.dto';

describe('ChatService', () => {
    let service: ChatService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatService],
        }).compile();

        service = module.get<ChatService>(ChatService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('saveMessage', () => {
        it('should save user message correctly', () => {
            // given
            const messageData: ChatMessageDto = {
                sender: 'testUser',
                content: '안녕하세요!',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            };

            // when
            const savedMessage = service.saveMessage(messageData);

            // then
            expect(savedMessage).toBeDefined();
            expect(savedMessage.sender).toBe('testUser');
            expect(savedMessage.content).toBe('안녕하세요!');
            expect(savedMessage.type).toBe('CHAT');
            expect(savedMessage.recipient).toBeNull();
            expect(savedMessage.timestamp).toBeDefined();
        });

        it('should save admin reply correctly', () => {
            // given
            const messageData: ChatMessageDto = {
                sender: 'admin',
                content: '답장입니다.',
                type: 'CHAT' as ChatMessageType,
                recipient: 'user123',
            };

            // when
            const savedMessage = service.saveMessage(messageData);

            // then
            expect(savedMessage).toBeDefined();
            expect(savedMessage.sender).toBe('admin');
            expect(savedMessage.content).toBe('답장입니다.');
            expect(savedMessage.recipient).toBe('user123');
        });

        it('should save join message correctly', () => {
            // given
            const messageData: ChatMessageDto = {
                sender: 'newUser',
                content: 'newUser 님이 문의를 시작했습니다.',
                type: 'JOIN' as ChatMessageType,
                recipient: null,
            };

            // when
            const savedMessage = service.saveMessage(messageData);

            // then
            expect(savedMessage).toBeDefined();
            expect(savedMessage.sender).toBe('newUser');
            expect(savedMessage.type).toBe('JOIN');
        });
    });

    describe('getChatHistory', () => {
        it('should return empty array for new user', () => {
            // given
            const userId = 'newUser';

            // when
            const history = service.getChatHistory(userId);

            // then
            expect(history).toEqual([]);
        });

        it('should return chat history for user with messages', () => {
            // given
            const user1 = 'user1';
            const user2 = 'user2';

            // 사용자 1의 메시지들 저장
            service.saveMessage({
                sender: user1,
                content: '첫 번째 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            service.saveMessage({
                sender: user1,
                content: '두 번째 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            // 사용자 2의 메시지 저장
            service.saveMessage({
                sender: user2,
                content: '다른 사용자 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            // when
            const user1History = service.getChatHistory(user1);
            const user2History = service.getChatHistory(user2);

            // then
            expect(user1History).toHaveLength(2);
            expect(user1History[0].sender).toBe(user1);
            expect(user1History[1].sender).toBe(user1);

            expect(user2History).toHaveLength(1);
            expect(user2History[0].sender).toBe(user2);
        });
    });

    describe('getAllMessages', () => {
        it('should return all messages for admin', () => {
            // given
            service.saveMessage({
                sender: 'user1',
                content: '사용자 1 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            service.saveMessage({
                sender: 'user2',
                content: '사용자 2 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            // when
            const allMessages = service.getAllMessages();

            // then
            expect(allMessages.length).toBeGreaterThanOrEqual(2);
            expect(allMessages.some(msg => msg.sender === 'user1')).toBe(true);
            expect(allMessages.some(msg => msg.sender === 'user2')).toBe(true);
        });
    });

    describe('clearHistory', () => {
        it('should clear chat history for specific user', () => {
            // given
            const user = 'testUser';
            service.saveMessage({
                sender: user,
                content: '테스트 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            // when
            service.clearHistory(user);

            // then
            const history = service.getChatHistory(user);
            expect(history).toEqual([]);
        });

        it('should not affect other users history', () => {
            // given
            const user1 = 'user1';
            const user2 = 'user2';

            service.saveMessage({
                sender: user1,
                content: '사용자 1 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            service.saveMessage({
                sender: user2,
                content: '사용자 2 메시지',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            });

            // when
            service.clearHistory(user1);

            // then
            const user1History = service.getChatHistory(user1);
            const user2History = service.getChatHistory(user2);

            expect(user1History).toEqual([]);
            expect(user2History).toHaveLength(1);
            expect(user2History[0].sender).toBe(user2);
        });
    });
}); 