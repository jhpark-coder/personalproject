import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

export type ChatMessageType = 'CHAT' | 'JOIN' | 'LEAVE';

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  sender: string;

  @Prop({ required: true })
  content: string;

  @Prop({ required: true, enum: ['CHAT', 'JOIN', 'LEAVE'], type: String })
  type: ChatMessageType;

  @Prop()
  recipient?: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);
