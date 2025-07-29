import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunicationGateway } from './communication.gateway';
import { ChatService } from '../chat/chat.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationsController } from '../notifications/notifications.controller';
import { ChatMessage, ChatMessageSchema } from '../schemas/chat-message.schema';
import { Notification, NotificationSchema } from '../schemas/notification.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationsController],
  providers: [
    CommunicationGateway,
    ChatService,
    NotificationsService,
  ],
  exports: [CommunicationGateway, ChatService, NotificationsService],
})
export class CommunicationModule {}