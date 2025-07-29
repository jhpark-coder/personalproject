import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('NotificationsGateway');

  constructor() {
    console.log('알림 웹소켓 서버 초기화 완료');
  }

  afterInit(server: Server) {
    this.logger.log('알림 웹소켓 서버 초기화 완료');
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
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`클라이언트 연결 끊김: ${client.id}`);
  }

  /**
   * 특정 사용자에게 새 알림을 전송합니다.
   * @param userId 알림을 받을 사용자의 ID
   * @param notification 알림 객체
   */
  public sendNotificationToUser(userId: number, notification: any) {
    this.logger.log(`${userId}번 사용자에게 알림을 전송합니다.`);
    this.server.to(String(userId)).emit('newNotification', notification);
  }

  /**
   * 관리자 그룹에게 새 알림을 전송합니다.
   * @param notification 알림 객체
   */
  public sendNotificationToAdminGroup(notification: any) {
    this.logger.log('관리자 그룹에게 알림을 전송합니다.');
    this.server.to('admin').emit('newNotification', notification);
  }

  private getUserIdFromSocket(client: Socket): number | null {
    // 소켓 연결에서 사용자 ID를 추출하는 로직
    // 실제 구현에서는 토큰이나 세션에서 사용자 ID를 가져와야 합니다
    return client.handshake.auth.userId || null;
  }

  private getUserRolesFromSocket(client: Socket): string[] | null {
    // 소켓 연결에서 사용자 역할을 추출하는 로직
    return client.handshake.auth.roles || null;
  }
}
