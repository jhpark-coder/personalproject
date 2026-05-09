import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunicationGateway } from './communication.gateway';
import { ChatService } from '../chat/chat.service';
import {
  ChatMessage,
  ChatMessageSchema,
} from '../shared/schemas/chat-message.schema';
import { AuthModule } from '../shared/auth/auth.module';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
    ]),
  ],
  providers: [CommunicationGateway, ChatService],
  exports: [CommunicationGateway, ChatService],
})
export class CommunicationModule {}
