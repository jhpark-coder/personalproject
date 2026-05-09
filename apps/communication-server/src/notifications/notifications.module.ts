import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationSchedulerService } from './notification-scheduler.service';
import {
  Notification,
  NotificationSchema,
} from '../shared/schemas/notification.schema';
import { SmsModule } from '../sms/sms.module';
import { CommunicationModule } from '../communication/communication.module';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
    SmsModule,
    CommunicationModule,
    AuthModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, NotificationSchedulerService],
  exports: [NotificationsService, NotificationSchedulerService],
})
export class NotificationsModule {}
