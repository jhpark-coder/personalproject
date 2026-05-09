import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatMessageDto, ChatUserDto } from '../chat/dto/chat-message.dto';
import { ChatService } from '../chat/chat.service';
import { Notification } from '../shared/schemas/notification.schema';
import { AuthIdentity, JwtAuthService } from '../shared/auth/jwt-auth.service';

const defaultSocketCorsOrigins = [
  'http://localhost:8080',
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:4000',
];

const socketCorsOrigins = [
  ...(process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
  process.env.FRONTEND_URL,
].filter((origin): origin is string => Boolean(origin) && origin !== '*');

@WebSocketGateway({
  cors: {
    origin:
      socketCorsOrigins.length > 0
        ? socketCorsOrigins
        : defaultSocketCorsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
  },
})
export class CommunicationGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('CommunicationGateway');

  afterInit() {
    this.logger.log('Communication socket server initialized.');
  }

  handleConnection(client: Socket) {
    const identity = this.jwtAuthService.getSocketIdentity(
      client.handshake.auth,
      client.handshake.headers?.authorization,
      client.handshake.headers?.cookie,
    );

    if (!identity) {
      this.logger.warn(`Unauthenticated socket rejected: ${client.id}`);
      client.disconnect(true);
      return;
    }

    client.data.auth = identity;
    client.join(identity.userId);
    this.logger.log(`Client ${client.id} joined user room ${identity.userId}.`);

    if (this.jwtAuthService.isAdmin(identity)) {
      client.join('admin');
      this.server.emit('adminOnline');
    }
  }

  handleDisconnect(client: Socket) {
    const identity = this.getSocketIdentity(client);

    if (this.jwtAuthService.isAdmin(identity)) {
      this.server.emit('adminOffline');
    }

    const disconnectedUser = this.chatService.removeOnlineUserBySocketId(
      client.id,
    );
    if (disconnectedUser) {
      this.server.to('admin').emit('userDisconnected', {
        sender: disconnectedUser,
        content: `${disconnectedUser} 님의 연결이 종료되었습니다.`,
        type: 'LEAVE',
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: ChatUserDto,
    @ConnectedSocket() client: Socket,
  ) {
    const identity = this.getSocketIdentity(client);
    if (!identity) {
      return { status: 'unauthorized', message: '인증이 필요합니다.' };
    }

    if (this.jwtAuthService.isAdmin(identity)) {
      this.logger.log(`Admin joinChat attempt blocked: ${data.sender}`);
      return {
        status: 'blocked',
        message: '관리자는 일반 사용자로 입장할 수 없습니다.',
      };
    }

    const sender = this.chatUsername(identity.userId);
    client.join(sender);
    this.chatService.addOnlineUser(sender, client.id);

    this.server.to('admin').emit('userJoined', {
      sender,
      content: `${sender} 님이 문의를 시작했습니다.`,
      type: 'JOIN',
      timestamp: new Date().toISOString(),
    });

    return { status: 'joined', user: sender };
  }

  @SubscribeMessage('joinAsAdmin')
  async handleJoinAsAdmin(
    @MessageBody() data: ChatUserDto,
    @ConnectedSocket() client: Socket,
  ) {
    const identity = this.getSocketIdentity(client);
    if (!this.jwtAuthService.isAdmin(identity)) {
      return {
        status: 'blocked',
        message: '관리자 권한이 필요합니다.',
      };
    }

    client.join('admin');
    this.logger.log(`Admin ${data.sender} joined admin room.`);
    this.server.emit('adminOnline');

    const onlineUsers = this.chatService.getOnlineUsers();
    client.emit('onlineUsers', onlineUsers);

    return { status: 'joined', role: 'admin' };
  }

  @SubscribeMessage('leaveAsAdmin')
  async handleLeaveAsAdmin(@ConnectedSocket() client: Socket) {
    const identity = this.getSocketIdentity(client);
    if (!this.jwtAuthService.isAdmin(identity)) {
      return {
        status: 'blocked',
        message: '관리자 권한이 필요합니다.',
      };
    }

    client.leave('admin');
    this.server.emit('adminOffline');
    return { status: 'left', role: 'admin' };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: ChatMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const identity = this.getSocketIdentity(client);
    if (!identity) {
      return { status: 'unauthorized', message: '인증이 필요합니다.' };
    }

    const isAdmin = this.jwtAuthService.isAdmin(identity);
    const messageData: ChatMessageDto = isAdmin
      ? data
      : {
          ...data,
          sender: this.chatUsername(identity.userId),
          recipient: null,
        };

    const savedMessage = await this.chatService.saveMessage(messageData);
    const messageWithAdminFlag = { ...savedMessage, isAdmin };

    if (messageData.recipient) {
      this.server
        .to(messageData.recipient)
        .emit('adminReply', messageWithAdminFlag);
      this.server.to('admin').emit('adminReply', messageWithAdminFlag);
    } else if (isAdmin) {
      this.server.to('admin').emit('adminReply', messageWithAdminFlag);
    } else {
      this.server.to('admin').emit('userMessage', messageWithAdminFlag);
      this.server
        .to(messageData.sender)
        .emit('chatMessage', messageWithAdminFlag);
    }

    return messageWithAdminFlag;
  }

  @SubscribeMessage('getHistory')
  async handleGetHistory(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const identity = this.getSocketIdentity(client);
    if (!identity) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    if (!this.canAccessChatUser(identity, data.userId)) {
      client.emit('error', {
        message: '다른 사용자의 채팅 내역을 볼 수 없습니다.',
      });
      return;
    }

    const history = await this.chatService.getChatHistory(data.userId);
    client.emit('chatHistory', { userId: data.userId, history });
  }

  @SubscribeMessage('getAllChatUsers')
  async handleGetAllChatUsers(@ConnectedSocket() client: Socket) {
    const identity = this.getSocketIdentity(client);
    if (!this.jwtAuthService.isAdmin(identity)) {
      client.emit('error', { message: '관리자 권한이 필요합니다.' });
      return;
    }

    const allUsers = await this.chatService.getAllChatUsers();
    client.emit('allChatUsers', allUsers);
  }

  @SubscribeMessage('getUserLastMessage')
  async handleGetUserLastMessage(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const identity = this.getSocketIdentity(client);
    if (!this.jwtAuthService.isAdmin(identity)) {
      client.emit('error', { message: '관리자 권한이 필요합니다.' });
      return;
    }

    const lastMessage = await this.chatService.getUserLastMessage(data.userId);
    client.emit('userLastMessage', { userId: data.userId, lastMessage });
  }

  @SubscribeMessage('getOnlineUsers')
  async handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineUsers = this.chatService.getOnlineUsers();
    client.emit('onlineUsers', onlineUsers);
  }

  @SubscribeMessage('checkAdminStatus')
  async handleCheckAdminStatus(@ConnectedSocket() client: Socket) {
    const adminRoom = this.server.sockets.adapter.rooms.get('admin');
    const hasAdminOnline = adminRoom && adminRoom.size > 0;

    if (hasAdminOnline) {
      client.emit('adminOnline');
    } else {
      client.emit('adminOffline');
    }
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const identity = this.getSocketIdentity(client);
    if (!identity) {
      client.emit('error', { message: '인증이 필요합니다.' });
      return;
    }

    const targetUserId = this.jwtAuthService.isAdmin(identity)
      ? data.userId
      : identity.userId;
    client.join(String(targetUserId));
  }

  public sendNotificationToUser(userId: string, notification: Notification) {
    this.server.to(String(userId)).emit('newNotification', notification);
  }

  public sendNotificationToAdminGroup(notification: Notification) {
    this.server.to('admin').emit('newNotification', notification);
  }

  public broadcastNotification(notification: Notification) {
    this.server.emit('broadcastNotification', notification);
  }

  private getSocketIdentity(client: Socket): AuthIdentity | null {
    return (client.data?.auth as AuthIdentity | undefined) || null;
  }

  private chatUsername(userId: string): string {
    return `사용자_${userId}`;
  }

  private canAccessChatUser(identity: AuthIdentity, userId: string): boolean {
    return (
      this.jwtAuthService.isAdmin(identity) ||
      identity.userId === userId ||
      this.chatUsername(identity.userId) === userId
    );
  }
}
