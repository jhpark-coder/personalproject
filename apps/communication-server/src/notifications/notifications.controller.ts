import {
  Body,
  Controller,
  Get,
  Headers,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Put,
} from '@nestjs/common';
import { CommunicationGateway } from '../communication/communication.gateway';
import { JwtAuthService } from '../shared/auth/jwt-auth.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationsService } from './notifications.service';

@Controller('api/notifications')
export class NotificationsController {
  constructor(
    private readonly communicationGateway: CommunicationGateway,
    private readonly notificationsService: NotificationsService,
    private readonly jwtAuthService: JwtAuthService,
  ) {}

  @Post('create')
  async createNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    this.jwtAuthService.requireAdmin(authorization, cookie);

    const savedNotification =
      await this.notificationsService.createNotification(createNotificationDto);

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

  @Get('user/:userId')
  async getUserNotifications(
    @Param('userId', ParseIntPipe) userId: number,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    this.jwtAuthService.requireUserAccess(authorization, cookie, userId);
    const notifications =
      await this.notificationsService.getUserNotifications(userId);
    return { notifications };
  }

  @Put(':id/read')
  async markAsRead(
    @Param('id') id: string,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    const identity = this.jwtAuthService.requireIdentity(authorization, cookie);
    const notification = await this.notificationsService.getNotification(id);
    if (!notification) {
      throw new NotFoundException('Notification not found');
    }
    if (
      !this.jwtAuthService.canAccessUser(identity, notification.targetUserId)
    ) {
      this.jwtAuthService.requireAdmin(authorization, cookie);
    }

    await this.notificationsService.markAsRead(id);
    return { success: true };
  }

  @Get('user/:userId/unread-count')
  async getUnreadCount(
    @Param('userId', ParseIntPipe) userId: number,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    this.jwtAuthService.requireUserAccess(authorization, cookie, userId);
    const count = await this.notificationsService.getUnreadCount(userId);
    return { unreadCount: count };
  }

  @Post('admin/create')
  async createAdminNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    this.jwtAuthService.requireAdmin(authorization, cookie);
    const savedNotification =
      await this.notificationsService.createNotification(createNotificationDto);
    this.communicationGateway.sendNotificationToAdminGroup(savedNotification);

    return {
      success: true,
      message: 'Admin notification broadcasted successfully',
      notification: savedNotification,
    };
  }

  @Post('broadcast')
  async broadcastNotification(
    @Body() createNotificationDto: CreateNotificationDto,
    @Headers('authorization') authorization?: string,
    @Headers('cookie') cookie?: string,
  ) {
    this.jwtAuthService.requireAdmin(authorization, cookie);
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
