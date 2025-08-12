import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { CommunicationGateway } from '../communication/communication.gateway';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly communicationGateway: CommunicationGateway,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Spring Boot에서 보낸 알림을 받아서 MongoDB에 저장하고 WebSocket으로 전송
  @Post('create')
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    // 1. MongoDB에 저장
    const savedNotification =
      await this.notificationsService.createNotification(createNotificationDto);

    // 2. WebSocket으로 실시간 전송
    if (createNotificationDto.targetUserId) {
      this.communicationGateway.sendNotificationToUser(
        createNotificationDto.targetUserId.toString(),
        savedNotification,
      );
    }

    return {
      success: true,
      message: 'Notification saved and sent successfully',
      notification: savedNotification,
    };
  }

  // 사용자 알림 목록 조회
  @Get('user/:userId')
  async getUserNotifications(@Param('userId') userId: number) {
    const notifications =
      await this.notificationsService.getUserNotifications(userId);
    return { notifications };
  }

  // 알림 읽음 처리
  @Put(':id/read')
  async markAsRead(@Param('id') id: string) {
    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  // 읽지 않은 알림 개수 조회
  @Get('user/:userId/unread-count')
  async getUnreadCount(@Param('userId') userId: number) {
    const count = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  // 관리자 알림 브로드캐스트
  @Post('admin/create')
  async createAdminNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const savedNotification =
      await this.notificationsService.createNotification(createNotificationDto);
    this.communicationGateway.sendNotificationToAdminGroup(savedNotification);

    return {
      success: true,
      message: 'Admin notification broadcasted successfully',
      notification: savedNotification,
    };
  }

  // 전체 브로드캐스트 알림
  @Post('broadcast')
  async broadcastNotification(
    @Body() createNotificationDto: CreateNotificationDto,
  ) {
    const savedNotification =
      await this.notificationsService.createNotification(createNotificationDto);
    this.communicationGateway.broadcastNotification(savedNotification);

    return {
      success: true,
      message: 'Broadcast notification sent successfully',
      notification: savedNotification,
    };
  }
}
