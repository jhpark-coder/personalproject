import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { ChatMessageDto, ChatUserDto, ChatMessageType } from './dto/chat-message.dto';

describe('ChatGateway', () => {
    let gateway: ChatGateway;
    let service: ChatService;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;
    let emitMock: jest.Mock;

    beforeEach(async () => {
        emitMock = jest.fn();
        // 항상 같은 emitMock을 반환하는 객체
        const emitObj = { emit: emitMock };
        mockServer = {
            to: jest.fn().mockReturnValue(emitObj),
        } as any;

        mockSocket = {
            id: 'test-socket-id',
            handshake: {
                auth: {
                    userId: 1,
                    username: 'testUser',
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
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ChatGateway,
                {
                    provide: ChatService,
                    useValue: {
                        saveMessage: jest.fn((msg) => msg),
                        getChatHistory: jest.fn(),
                    },
                },
            ],
        }).compile();

        gateway = module.get<ChatGateway>(ChatGateway);
        service = module.get<ChatService>(ChatService);

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
                        username: 'testUser',
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
            } as any;

            // when
            gateway.handleConnection(mockSocket);

            // then
            expect(mockSocket.join).toHaveBeenCalledWith('1'); // 사용자 ID로 방 참가
        });

        it('should handle admin connection correctly', () => {
            // given
            const mockSocket = {
                id: 'admin-socket-id',
                handshake: {
                    auth: {
                        userId: 2,
                        username: 'admin',
                        roles: ['ROLE_ADMIN'],
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
            } as any;

            // when
            gateway.handleConnection(mockSocket);

            // then
            expect(mockSocket.join).toHaveBeenCalledWith('2'); // 사용자 방
            expect(mockSocket.join).toHaveBeenCalledWith('admin'); // 관리자 방
        });
    });

    describe('handleSendMessage', () => {
        it('should handle user message correctly', async () => {
            // given
            const messageData: ChatMessageDto = {
                sender: 'testUser',
                content: '안녕하세요!',
                type: 'CHAT' as ChatMessageType,
                recipient: null,
            };

            // when
            await gateway.handleSendMessage(messageData);

            // then
            expect(mockServer.to).toHaveBeenCalledWith('admin');
            expect(mockServer.to).toHaveBeenCalledWith('testUser');
            expect(emitMock).toHaveBeenCalledTimes(2);
            expect(emitMock).toHaveBeenNthCalledWith(1, 'chat.message', expect.any(Object));
            expect(emitMock).toHaveBeenNthCalledWith(2, 'chat.message', expect.any(Object));
        });

        it('should handle admin reply correctly', async () => {
            // given
            const messageData: ChatMessageDto = {
                sender: 'admin',
                content: '답장입니다.',
                type: 'CHAT' as ChatMessageType,
                recipient: 'user123',
            };

            // when
            await gateway.handleSendMessage(messageData);

            // then
            expect(mockServer.to).toHaveBeenCalledWith('user123');
            expect(mockServer.to).toHaveBeenCalledWith('admin');
            expect(emitMock).toHaveBeenCalledTimes(2);
            expect(emitMock).toHaveBeenNthCalledWith(1, 'chat.message', expect.any(Object));
            expect(emitMock).toHaveBeenNthCalledWith(2, 'chat.message', expect.any(Object));
        });
    });

    describe('handleAddUser', () => {
        it('should handle user join correctly', async () => {
            // given
            const userData: ChatUserDto = {
                sender: 'newUser',
                type: 'JOIN' as ChatMessageType,
            };

            // when
            await gateway.handleAddUser(userData);

            // then
            expect(mockServer.to).toHaveBeenCalledWith('admin');
            expect(emitMock).toHaveBeenCalledTimes(1);
            expect(emitMock).toHaveBeenCalledWith('chat.message', expect.any(Object));
        });
    });
}); 