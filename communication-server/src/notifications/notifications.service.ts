import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from '../schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<NotificationDocument>,
  ) {}

  // Spring Boot에서 보낸 알림을 MongoDB에 저장
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = new this.notificationModel({
      ...createNotificationDto,
      isRead: false,
      createdAt: new Date(Date.now() + (9 * 60 * 60 * 1000)),
    });

    return await notification.save();
  }

  // 사용자의 알림 목록 조회
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return this.notificationModel
      .find({
        $or: [
          { targetUserId: userId }, // 특정 사용자에게 보낸 알림
          { targetUserId: 0 }, // 전체 사용자 대상 알림
        ],
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  // 알림 읽음 처리
  async markAsRead(notificationId: string): Promise<void> {
    await this.notificationModel.findByIdAndUpdate(notificationId, {
      isRead: true,
    });
  }

  // 읽지 않은 알림 개수 조회
  async getUnreadCount(userId: number): Promise<number> {
    return this.notificationModel.countDocuments({
      $and: [
        {
          $or: [
            { targetUserId: userId }, // 특정 사용자에게 보낸 알림
            { targetUserId: 0 }, // 전체 사용자 대상 알림
          ],
        },
        { isRead: false }, // 읽지 않은 알림
      ],
    });
  }
}
