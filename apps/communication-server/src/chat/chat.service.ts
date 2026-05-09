import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessageDto } from './dto/chat-message.dto';
import {
  ChatMessage,
  ChatMessageDocument,
} from '../shared/schemas/chat-message.schema';

interface OnlineUser {
  username: string;
  socketId: string;
  joinedAt: Date;
  lastActivity: Date;
}

type ChatMessageWithAdminFlag = ChatMessageDto & { isAdmin?: boolean };

@Injectable()
export class ChatService {
  private onlineUsers: Map<string, OnlineUser> = new Map();
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatMessage.name)
    private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  async saveMessage(messageData: ChatMessageDto): Promise<ChatMessageDto> {
    const message = new this.chatMessageModel({
      ...messageData,
      timestamp: new Date(),
    });

    const savedMessage = await message.save();

    if (messageData.sender) {
      this.updateUserActivity(messageData.sender);
    }

    return savedMessage.toObject() as ChatMessageDto;
  }

  async getChatHistory(userId: string): Promise<ChatMessageWithAdminFlag[]> {
    try {
      const candidates = this.chatUserCandidates(userId);
      const history = await this.chatMessageModel
        .find({
          $or: [
            { sender: { $in: candidates } },
            { recipient: { $in: candidates } },
          ],
        })
        .sort({ timestamp: 1 })
        .exec();

      this.logger.debug(`Chat history loaded: count=${history.length}`);

      return history.map((doc) => {
        const message = doc.toObject() as ChatMessageDto;
        const isAdmin = Boolean(
          message.sender &&
            (message.sender.startsWith('관리자') ||
              message.sender.toLowerCase().includes('admin')),
        );
        return { ...message, isAdmin };
      });
    } catch (error) {
      this.logger.error(
        'Chat history lookup failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getAllMessages(): Promise<ChatMessageDto[]> {
    try {
      const messages = await this.chatMessageModel
        .find()
        .sort({ timestamp: 1 })
        .exec();
      return messages.map((doc) => doc.toObject() as ChatMessageDto);
    } catch (error) {
      this.logger.error(
        'All message lookup failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async clearHistory(userId: string): Promise<void> {
    try {
      const candidates = this.chatUserCandidates(userId);
      await this.chatMessageModel.deleteMany({
        $or: [
          { sender: { $in: candidates } },
          { recipient: { $in: candidates } },
        ],
      });
      this.logger.debug('Chat history cleared.');
    } catch (error) {
      this.logger.error(
        'Chat history clear failed.',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  addOnlineUser(username: string, socketId: string): void {
    const user: OnlineUser = {
      username,
      socketId,
      joinedAt: new Date(),
      lastActivity: new Date(),
    };

    this.onlineUsers.set(username, user);
  }

  removeOnlineUser(username: string): void {
    this.onlineUsers.delete(username);
  }

  removeOnlineUserBySocketId(socketId: string): string | null {
    for (const [username, user] of this.onlineUsers.entries()) {
      if (user.socketId === socketId) {
        this.onlineUsers.delete(username);
        return username;
      }
    }
    return null;
  }

  getOnlineUsers(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  getOnlineUserCount(): number {
    return this.onlineUsers.size;
  }

  updateUserActivity(username: string): void {
    const user = this.onlineUsers.get(username);
    if (user) {
      user.lastActivity = new Date();
      this.onlineUsers.set(username, user);
    }
  }

  isUserOnline(username: string): boolean {
    return this.onlineUsers.has(username);
  }

  getUserInfo(username: string): OnlineUser | null {
    return this.onlineUsers.get(username) || null;
  }

  async getAllChatUsers(): Promise<string[]> {
    try {
      const users = await this.chatMessageModel.distinct('sender').exec();
      this.logger.debug(`Chat users loaded: count=${users.length}`);
      return users;
    } catch (error) {
      this.logger.error(
        'Chat user lookup failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  async getUserLastMessage(userId: string): Promise<ChatMessageDto | null> {
    try {
      const candidates = this.chatUserCandidates(userId);
      const lastMessage = await this.chatMessageModel
        .findOne({
          $or: [
            { sender: { $in: candidates } },
            { recipient: { $in: candidates } },
          ],
        })
        .sort({ timestamp: -1 })
        .exec();

      return lastMessage ? (lastMessage.toObject() as ChatMessageDto) : null;
    } catch (error) {
      this.logger.error(
        'Last chat message lookup failed.',
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  cleanupInactiveUsers(): void {
    const now = new Date();
    const threshold = new Date(now.getTime() - 30 * 60 * 1000);
    for (const [username, user] of this.onlineUsers.entries()) {
      if (user.lastActivity.getTime() < threshold.getTime()) {
        this.onlineUsers.delete(username);
      }
    }
  }

  private chatUserCandidates(userId: string): string[] {
    return Array.from(new Set([userId, `사용자_${userId}`]));
  }
}
