import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer,
    ConnectedSocket,
} from '@nestjs/websockets';
import { ChatService } from './chat.service';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatMessageDto, ChatUserDto } from './dto/chat-message.dto';

@WebSocketGateway({
    cors: {
        origin: [
            'http://localhost:8080', 
            'http://localhost:3000',
            'http://localhost:4000',
            'http://localhost:5173',
            'file://',
            '*'
        ],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    },
})
export class ChatGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private logger: Logger = new Logger('ChatGateway');

    constructor(private readonly chatService: ChatService) {
        console.log('채팅 웹소켓 서버 초기화 완료');
    }

    afterInit(server: Server) {
        this.logger.log('채팅 웹소켓 서버 초기화 완료');
    }

    handleConnection(client: Socket, ...args: any[]) {
        this.logger.log(`클라이언트 연결: ${client.id}`);
        const userId = this.getUserIdFromSocket(client);
        const userRoles = this.getUserRolesFromSocket(client);

        if (userId) {
            client.join(String(userId));
            this.logger.log(`클라이언트 ${client.id}가 사용자 ${userId} 방에 참가했습니다.`);
        }

        // 사용자가 ADMIN 역할을 가지고 있으면 admin 방에도 참가
        if (userRoles && userRoles.includes('ROLE_ADMIN')) {
            client.join('admin');
            this.logger.log(`관리자 ${client.id}가 admin 방에 참가했습니다.`);
            // 온라인 상태는 관리자 대시보드 접속 시에만 설정
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`클라이언트 연결 끊김: ${client.id}`);

        // 관리자가 연결을 끊었는지 확인
        const userRoles = this.getUserRolesFromSocket(client);
        if (userRoles && userRoles.includes('ROLE_ADMIN')) {
            this.logger.log(`관리자 연결 해제`);
            // 관리자 오프라인 상태를 모든 사용자에게 알림
            this.server.emit('adminOffline');
        }

        // 온라인 사용자 목록에서 제거
        const disconnectedUser = this.chatService.removeOnlineUserBySocketId(client.id);
        if (disconnectedUser) {
            this.logger.log(`사용자 ${disconnectedUser} 연결 해제`);

            // 관리자에게 사용자 연결 해제 알림
            this.server.to('admin').emit('userDisconnected', {
                sender: disconnectedUser,
                content: `${disconnectedUser} 님이 연결을 종료했습니다.`,
                type: 'LEAVE',
                timestamp: new Date().toISOString()
            });
        }
    }



    @SubscribeMessage('chat.addUser')
    async handleAddUser(@MessageBody() data: ChatUserDto) {
        const joinMessage: ChatMessageDto = {
            sender: data.sender,
            content: `${data.sender} 님이 문의를 시작했습니다.`,
            type: 'JOIN',
            recipient: null,
        };

        // 관리자 토픽에만 입장 알림 전송
        this.server.to('admin').emit('chat.message', joinMessage);

        return joinMessage;
    }

    @SubscribeMessage('joinAsAdmin')
    async handleJoinAsAdmin(@MessageBody() data: ChatUserDto, @ConnectedSocket() client: Socket) {
        // 관리자 방에 참가
        client.join('admin');
        this.logger.log(`관리자 ${data.sender}가 admin 방에 참가했습니다.`);

        // 관리자 온라인 상태를 모든 사용자에게 알림
        this.server.emit('adminOnline');

        // 현재 접속 중인 사용자 목록을 관리자에게 전송
        const onlineUsers = this.chatService.getOnlineUsers();
        client.emit('onlineUsers', onlineUsers);

        return { status: 'joined', role: 'admin' };
    }

    @SubscribeMessage('leaveAsAdmin')
    async handleLeaveAsAdmin(@ConnectedSocket() client: Socket) {
        // 관리자 방에서 나가기
        client.leave('admin');
        this.logger.log(`관리자가 admin 방에서 나갔습니다.`);

        // 관리자 오프라인 상태를 모든 사용자에게 알림
        this.server.emit('adminOffline');

        return { status: 'left', role: 'admin' };
    }

    @SubscribeMessage('joinChat')
    async handleJoinChat(@MessageBody() data: ChatUserDto, @ConnectedSocket() client: Socket) {
        // 사용자 방에 참가
        client.join(data.sender);
        this.logger.log(`사용자 ${data.sender}가 채팅에 참가했습니다.`);

        // 사용자 접속 정보 저장
        this.chatService.addOnlineUser(data.sender, client.id);

        // 관리자에게 사용자 접속 알림
        this.server.to('admin').emit('userJoined', {
            sender: data.sender,
            content: `${data.sender} 님이 문의를 시작했습니다.`,
            type: 'JOIN',
            timestamp: new Date().toISOString()
        });

        return { status: 'joined', user: data.sender };
    }

    @SubscribeMessage('sendMessage')
    async handleSendMessage(@MessageBody() data: ChatMessageDto, @ConnectedSocket() client: Socket) {
        // 메시지 저장 (DB 포함)
        const savedMessage = await this.chatService.saveMessage(data);

        // Case 1: 관리자가 특정 사용자에게 답장
        if (data.recipient && data.recipient !== '') {
            // 특정 사용자에게 전송
            this.server.to(data.recipient).emit('adminReply', savedMessage);
            // 관리자 토픽에도 전송
            this.server.to('admin').emit('adminReply', savedMessage);
        }
        // Case 2: 일반 사용자 메시지
        else {
            // 관리자 토픽에 전송
            this.server.to('admin').emit('userMessage', savedMessage);
            // 사용자 개인 토픽에도 전송 (자신의 메시지 확인용)
            this.server.to(data.sender).emit('chatMessage', savedMessage);
        }

        return savedMessage;
    }

    @SubscribeMessage('getHistory')
    async handleGetHistory(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
        console.log('🔍 채팅 내역 요청 수신:', data);
        const history = await this.chatService.getChatHistory(data.userId);
        console.log('📋 채팅 내역 조회 완료:', { userId: data.userId, historyCount: history.length });
        client.emit('chatHistory', { userId: data.userId, history });
        console.log('📤 채팅 내역 전송 완료');
    }

    @SubscribeMessage('getOnlineUsers')
    async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
        console.log('👥 온라인 사용자 목록 요청 수신');
        const onlineUsers = this.chatService.getOnlineUsers();
        console.log('📋 온라인 사용자 목록:', onlineUsers);
        client.emit('onlineUsers', onlineUsers);
        console.log('📤 온라인 사용자 목록 전송 완료');
    }

    @SubscribeMessage('getAllChatUsers')
    async handleGetAllChatUsers(@ConnectedSocket() client: Socket) {
        console.log('👥 모든 채팅 사용자 목록 요청 수신');
        const allUsers = await this.chatService.getAllChatUsers();
        console.log('📋 모든 채팅 사용자 목록:', allUsers);
        client.emit('allChatUsers', allUsers);
        console.log('📤 모든 채팅 사용자 목록 전송 완료');
    }

    @SubscribeMessage('getUserLastMessage')
    async handleGetUserLastMessage(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
        console.log('📨 사용자 최근 메시지 요청 수신:', data);
        const lastMessage = await this.chatService.getUserLastMessage(data.userId);
        console.log('📋 사용자 최근 메시지:', lastMessage);
        client.emit('userLastMessage', { userId: data.userId, lastMessage });
        console.log('📤 사용자 최근 메시지 전송 완료');
    }

    private getUserIdFromSocket(client: Socket): number | null {
        return client.handshake.auth?.userId || null;
    }

    private getUserRolesFromSocket(client: Socket): string[] | null {
        return client.handshake.auth?.roles || null;
    }
} 