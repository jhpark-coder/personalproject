import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ChatService } from '../chat/chat.service';
import { ChatMessageDto, ChatUserDto } from '../chat/dto/chat-message.dto';
import { Notification } from '../shared/schemas/notification.schema';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:8080', // Spring Boot 백엔드
      'http://localhost:5173', // React 프론트엔드 (HTTP)
      'https://localhost:5173', // React 프론트엔드 (HTTPS)
      'http://localhost:4000', // 추가 프론트엔드
      'file://',
      '*',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },
})
export class CommunicationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(private readonly chatService: ChatService) {}

  @WebSocketServer()
  server: Server;

  private logger = new Logger('CommunicationGateway');

  afterInit() {
    this.logger.log('🚀 통합 통신 웹소켓 서버가 초기화되었습니다.');
  }

  handleConnection(client: Socket) {
    this.logger.log(`🔗 클라이언트 연결: ${client.id}`);
    const userId = this.getUserIdFromSocket(client);
    const userRoles = this.getUserRolesFromSocket(client);

    if (userId) {
      client.join(String(userId));
      this.logger.log(
        `👤 클라이언트 ${client.id}가 사용자 ID '${userId}' 방에 참가했습니다.`,
      );
    }

    if (userRoles && userRoles.includes('ROLE_ADMIN')) {
      client.join('admin');
      this.logger.log(`👨‍💼 관리자 ${client.id}가 'admin' 방에 참가했습니다.`);
      this.server.emit('adminOnline');
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`🔌 클라이언트 연결 끊김: ${client.id}`);
    const userRoles = this.getUserRolesFromSocket(client);

    if (userRoles && userRoles.includes('ROLE_ADMIN')) {
      this.logger.log(`👨‍💼 관리자 연결 해제`);
      this.server.emit('adminOffline');
    }

    const disconnectedUser = this.chatService.removeOnlineUserBySocketId(
      client.id,
    );
    if (disconnectedUser) {
      this.logger.log(`👤 사용자 ${disconnectedUser} 연결 해제`);
      this.server.to('admin').emit('userDisconnected', {
        sender: disconnectedUser,
        content: `${disconnectedUser} 님이 연결을 종료했습니다.`,
        type: 'LEAVE',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ===== 채팅 관련 기능 =====
  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: ChatUserDto,
    @ConnectedSocket() client: Socket,
  ) {
    // 관리자가 일반 사용자로 입장하려고 할 때 차단
    const userRoles = this.getUserRolesFromSocket(client);
    if (userRoles && userRoles.includes('ROLE_ADMIN')) {
      this.logger.log(
        `🚫 관리자가 일반 사용자로 입장 시도 차단: ${data.sender}`,
      );
      return {
        status: 'blocked',
        message: '관리자는 일반 사용자로 입장할 수 없습니다.',
      };
    }

    client.join(data.sender);
    this.logger.log(`👤 사용자 ${data.sender}가 채팅에 참가했습니다.`);
    this.chatService.addOnlineUser(data.sender, client.id);

    this.server.to('admin').emit('userJoined', {
      sender: data.sender,
      content: `${data.sender} 님이 문의를 시작했습니다.`,
      type: 'JOIN',
      timestamp: new Date().toISOString(),
    });

    return { status: 'joined', user: data.sender };
  }

  @SubscribeMessage('joinAsAdmin')
  async handleJoinAsAdmin(
    @MessageBody() data: ChatUserDto,
    @ConnectedSocket() client: Socket,
  ) {
    client.join('admin');
    this.logger.log(`👨‍💼 관리자 ${data.sender}가 admin 방에 참가했습니다.`);
    this.server.emit('adminOnline');

    const onlineUsers = this.chatService.getOnlineUsers();
    client.emit('onlineUsers', onlineUsers);

    return { status: 'joined', role: 'admin' };
  }

  @SubscribeMessage('leaveAsAdmin')
  async handleLeaveAsAdmin(@ConnectedSocket() client: Socket) {
    client.leave('admin');
    this.logger.log(`👨‍💼 관리자가 admin 방에서 나갔습니다.`);
    this.server.emit('adminOffline');
    return { status: 'left', role: 'admin' };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`📤 메시지 수신:`, data);
    const savedMessage = await this.chatService.saveMessage(data);

    // 관리자 역할 확인
    const userRoles = this.getUserRolesFromSocket(client);
    const isAdmin = userRoles && userRoles.includes('ROLE_ADMIN');

    // isAdmin 필드 추가
    const messageWithAdminFlag = { ...savedMessage, isAdmin };

    if (data.recipient && data.recipient !== '') {
      // 관리자가 특정 사용자에게 답장
      this.server.to(data.recipient).emit('adminReply', messageWithAdminFlag);
      this.server.to('admin').emit('adminReply', messageWithAdminFlag);
    } else if (isAdmin) {
      // 관리자가 보낸 메시지는 관리자 방에만 전송
      this.server.to('admin').emit('adminReply', messageWithAdminFlag);
    } else {
      // 일반 사용자 메시지
      this.server.to('admin').emit('userMessage', messageWithAdminFlag);
      // 사용자 자신에게도 메시지 전송 (확인용)
      this.server.to(data.sender).emit('chatMessage', messageWithAdminFlag);
    }

    this.logger.log(`✅ 메시지 처리 완료:`, messageWithAdminFlag);
    return messageWithAdminFlag;
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`🔍 채팅 내역 요청: ${data.userId}`);
    const history = await this.chatService.getChatHistory(data.userId);
    client.emit('chatHistory', { userId: data.userId, history });
  }

  @SubscribeMessage('getAllChatUsers')
  async handleGetAllChatUsers(@ConnectedSocket() client: Socket) {
    this.logger.log(`👥 모든 채팅 사용자 목록 요청`);
    const allUsers = await this.chatService.getAllChatUsers();
    client.emit('allChatUsers', allUsers);
  }

  @SubscribeMessage('getUserLastMessage')
  async handleGetUserLastMessage(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`📨 사용자 최근 메시지 요청: ${data.userId}`);
    const lastMessage = await this.chatService.getUserLastMessage(data.userId);
    client.emit('userLastMessage', { userId: data.userId, lastMessage });
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    this.logger.log(`👥 온라인 사용자 목록 요청`);
    const onlineUsers = this.chatService.getOnlineUsers();
    client.emit('onlineUsers', onlineUsers);
  }

  @SubscribeMessage('checkAdminStatus')
  async handleCheckAdminStatus(@ConnectedSocket() client: Socket) {
    this.logger.log(`👨‍💼 관리자 상태 확인 요청`);
    // 현재 admin 방에 있는 클라이언트 수를 확인
    const adminRoom = this.server.sockets.adapter.rooms.get('admin');
    const hasAdminOnline = adminRoom && adminRoom.size > 0;

    if (hasAdminOnline) {
      client.emit('adminOnline');
    } else {
      client.emit('adminOffline');
    }
  }

  // ===== 알림 관련 기능 =====
  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`📢 사용자 ${data.userId}가 알림을 구독했습니다.`);
    client.join(String(data.userId));
    this.logger.log(
      `👤 클라이언트 ${client.id}가 사용자 ID '${data.userId}' 방에 참가했습니다.`,
    );
  }

  public sendNotificationToUser(userId: string, notification: Notification) {
    this.logger.log(`📢 ${userId}번 사용자에게 알림 전송:`, notification);
    this.server.to(String(userId)).emit('newNotification', notification);
  }

  public sendNotificationToAdminGroup(notification: Notification) {
    this.logger.log(`📢 관리자 그룹에게 알림 전송:`, notification);
    this.server.to('admin').emit('newNotification', notification);
  }

  public broadcastNotification(notification: Notification) {
    this.logger.log(`📢 전체 알림 브로드캐스트:`, notification);
    this.server.emit('broadcastNotification', notification);
  }

  // ===== Helper Functions =====
  private getUserIdFromSocket(client: Socket): string | null {
    return client.handshake.auth?.userId || null;
  }

  private getUserRolesFromSocket(client: Socket): string[] | null {
    return client.handshake.auth?.roles || null;
  }
}
