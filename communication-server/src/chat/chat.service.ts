import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessageDto, ChatMessageType } from './dto/chat-message.dto';
import { ChatMessage, ChatMessageDocument } from '../schemas/chat-message.schema';

interface OnlineUser {
    username: string;
    socketId: string;
    joinedAt: Date;
    lastActivity: Date;
}

@Injectable()
export class ChatService {
    private onlineUsers: Map<string, OnlineUser> = new Map();
    private readonly logger = new Logger(ChatService.name);

    constructor(
        @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
    ) {}

    async saveMessage(messageData: ChatMessageDto): Promise<ChatMessageDto> {
        const message = new this.chatMessageModel({
            ...messageData,
            timestamp: new Date(),
        });

        // MongoDB에 직접 저장
        const savedMessage = await message.save();
        
        // 사용자 활동 업데이트
        if (messageData.sender) {
            this.updateUserActivity(messageData.sender);
        }

        return savedMessage.toObject() as ChatMessageDto;
    }

    async getChatHistory(userId: string): Promise<ChatMessageDto[]> {
        console.log('🔍 채팅 내역 조회 시작:', userId);
        
        try {
            // userId로 직접 검색하거나 "사용자_${userId}" 형태로 검색
            const history = await this.chatMessageModel
                .find({
                    $or: [
                        { sender: userId },
                        { sender: `사용자_${userId}` },
                        { recipient: userId },
                        { recipient: `사용자_${userId}` }
                    ]
                })
                .sort({ timestamp: 1 })
                .exec();
            
            console.log('✅ MongoDB에서 조회된 채팅 내역:', history);
            
            // 각 메시지에 isAdmin 필드 추가
            return history.map(doc => {
                const message = doc.toObject() as ChatMessageDto;
                // sender가 "관리자"로 시작하면 관리자 메시지로 판단
                const isAdmin = message.sender && message.sender.startsWith('관리자');
                return { ...message, isAdmin };
            });
        } catch (error) {
            console.error('❌ MongoDB 조회 중 오류 발생:', error);
            this.logger.error(`채팅 내역 조회 실패 - 사용자: ${userId}`, error);
            return [];
        }
    }

    async getAllMessages(): Promise<ChatMessageDto[]> {
        try {
            const messages = await this.chatMessageModel.find().sort({ timestamp: 1 }).exec();
            return messages.map(doc => doc.toObject() as ChatMessageDto);
        } catch (error) {
            console.error('❌ 전체 메시지 조회 중 오류 발생:', error);
            this.logger.error('전체 메시지 조회 실패', error);
            return [];
        }
    }

    async clearHistory(userId: string): Promise<void> {
        try {
            await this.chatMessageModel.deleteMany({
                $or: [
                    { sender: userId },
                    { sender: `사용자_${userId}` },
                    { recipient: userId },
                    { recipient: `사용자_${userId}` }
                ]
            });
            console.log(`✅ 사용자 ${userId}의 채팅 내역 삭제 완료`);
        } catch (error) {
            console.error('❌ 채팅 내역 삭제 중 오류 발생:', error);
            this.logger.error(`채팅 내역 삭제 실패 - 사용자: ${userId}`, error);
            throw error;
        }
    }

    // 온라인 사용자 관리
    addOnlineUser(username: string, socketId: string): void {
        const user: OnlineUser = {
            username,
            socketId,
            joinedAt: new Date(),
            lastActivity: new Date()
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
            console.log('📋 모든 채팅 사용자:', users);
            return users;
        } catch (error) {
            console.error('❌ 채팅 사용자 조회 중 오류:', error);
            return [];
        }
    }

    async getUserLastMessage(userId: string): Promise<ChatMessageDto | null> {
        try {
            const lastMessage = await this.chatMessageModel
                .findOne({
                    $or: [
                        { sender: userId },
                        { sender: `사용자_${userId}` },
                        { recipient: userId },
                        { recipient: `사용자_${userId}` }
                    ]
                })
                .sort({ timestamp: -1 })
                .exec();
            
            console.log('📝 사용자 마지막 메시지:', lastMessage);
            return lastMessage ? lastMessage.toObject() as ChatMessageDto : null;
        } catch (error) {
            console.error('❌ 마지막 메시지 조회 중 오류:', error);
            return null;
        }
    }

    cleanupInactiveUsers(): void {
        const now = new Date();
        const threshold = new Date(now.getTime() - 30 * 60 * 1000); // 30분

        for (const [username, user] of this.onlineUsers.entries()) {
            if (user.lastActivity.getTime() < threshold.getTime()) {
                this.onlineUsers.delete(username);
            }
        }
    }
} 