# FitMate 프로젝트 - 실시간 통신 및 알림 시스템 분석

## 개요
FitMate의 실시간 소통을 담당하는 Communication Server(NestJS) 기반의 WebSocket 통신, SMS 알림, 스케줄러 시스템에 대한 상세 분석입니다. Socket.IO를 통한 실시간 채팅, Twilio SMS, MongoDB 기반 알림 관리를 포괄합니다.

## 시스템 아키텍처

### 통신 서버 구조
```
┌─────────────────────────────────────────────────────────────┐
│                Communication Server (NestJS)                │
├─────────────────┬─────────────────┬─────────────────────────┤
│   WebSocket     │   SMS Service   │   Notification System   │
│   (Socket.IO)   │   (Twilio)      │   (MongoDB)            │
└─────────────────┴─────────────────┴─────────────────────────┘
         │                 │                     │
         ▼                 ▼                     ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│ Frontend Client │ │ External Users  │ │ Database        │
│ (React)         │ │ (SMS Recipients)│ │ (MongoDB)       │
└─────────────────┘ ┌─────────────────┘ └─────────────────┘
```

### 마이크로서비스 통신 흐름
```
Frontend ←→ Nginx ←→ Communication Server ←→ MongoDB
              ↓            ↓                    ↓
         Main Backend   Twilio API         Notification DB
         (Spring Boot)                     Chat Messages
```

## 파일 구조

### Communication Server (NestJS)
```
communication-server/src/
├── main.ts                           # 애플리케이션 진입점
├── app.module.ts                     # 루트 모듈
├── communication/
│   ├── communication.module.ts      # 통신 모듈
│   └── communication.gateway.ts     # WebSocket 게이트웨이
├── chat/
│   ├── chat.module.ts               # 채팅 모듈
│   ├── chat.service.ts              # 채팅 서비스
│   ├── chat.controller.ts           # 채팅 컨트롤러
│   └── schemas/
│       └── chat-message.schema.ts   # 메시지 스키마
├── notifications/
│   ├── notifications.module.ts      # 알림 모듈
│   ├── notifications.service.ts     # 알림 서비스
│   ├── notifications.controller.ts  # 알림 컨트롤러
│   └── schemas/
│       └── notification.schema.ts   # 알림 스키마
├── sms/
│   ├── sms.module.ts                # SMS 모듈
│   ├── sms.service.ts               # SMS 서비스
│   ├── sms.controller.ts            # SMS 컨트롤러
│   └── interfaces/
│       └── sms.interface.ts         # SMS 인터페이스
├── config/
│   ├── database.config.ts           # 데이터베이스 설정
│   └── twilio.config.ts             # Twilio 설정
└── common/
    ├── filters/                     # 예외 필터
    ├── guards/                      # 가드
    └── interceptors/                # 인터셉터
```

## 실시간 WebSocket 통신 시스템

### 1. Communication Gateway 구현
```typescript
// communication.gateway.ts
import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
  namespace: '/',
})
export class CommunicationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // socketId -> userId
  private userSockets = new Map<string, string>();   // userId -> socketId

  constructor(
    private readonly chatService: ChatService,
    private readonly notificationService: NotificationService,
  ) {}

  async handleConnection(client: Socket) {
    console.log(`클라이언트 연결: ${client.id}`);
    
    // JWT 토큰에서 사용자 ID 추출
    const token = client.handshake.auth.token;
    if (token) {
      try {
        const userId = await this.extractUserIdFromToken(token);
        this.connectedUsers.set(client.id, userId);
        this.userSockets.set(userId, client.id);
        
        // 사용자 온라인 상태 업데이트
        this.server.emit('userOnline', { userId, socketId: client.id });
        
        // 읽지 않은 알림 수 전송
        const unreadCount = await this.notificationService.getUnreadCount(userId);
        client.emit('unreadNotificationCount', unreadCount);
        
        console.log(`사용자 ${userId} 연결됨`);
      } catch (error) {
        console.error('토큰 검증 실패:', error);
        client.disconnect();
      }
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (userId) {
      this.connectedUsers.delete(client.id);
      this.userSockets.delete(userId);
      
      // 사용자 오프라인 상태 업데이트
      this.server.emit('userOffline', { userId });
      console.log(`사용자 ${userId} 연결 해제됨`);
    }
  }

  @SubscribeMessage('joinChat')
  async handleJoinChat(
    @MessageBody() data: { chatRoomId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    // 채팅방 참여
    await client.join(data.chatRoomId);
    
    // 채팅 히스토리 전송
    const messages = await this.chatService.getChatHistory(data.chatRoomId, 50);
    client.emit('chatHistory', messages);
    
    // 다른 사용자들에게 참여 알림
    client.to(data.chatRoomId).emit('userJoined', { userId, chatRoomId: data.chatRoomId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() data: { chatRoomId: string; message: string; messageType?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    try {
      // 메시지 저장
      const savedMessage = await this.chatService.saveMessage({
        chatRoomId: data.chatRoomId,
        senderId: userId,
        message: data.message,
        messageType: data.messageType || 'text',
        timestamp: new Date(),
      });

      // 채팅방 참여자들에게 메시지 전송
      this.server.to(data.chatRoomId).emit('newMessage', savedMessage);
      
      // 오프라인 사용자에게 푸시 알림 생성
      await this.createOfflineNotifications(data.chatRoomId, userId, data.message);
      
    } catch (error) {
      console.error('메시지 전송 실패:', error);
      client.emit('error', { message: '메시지 전송에 실패했습니다.' });
    }
  }

  @SubscribeMessage('joinAsAdmin')
  async handleJoinAsAdmin(@ConnectedSocket() client: Socket) {
    const userId = this.connectedUsers.get(client.id);
    if (!userId) return;

    // 관리자 권한 확인
    const isAdmin = await this.verifyAdminRole(userId);
    if (!isAdmin) {
      client.emit('error', { message: '관리자 권한이 없습니다.' });
      return;
    }

    // 관리자 룸 참여
    await client.join('admin-room');
    
    // 모든 채팅 사용자 목록 전송
    const allChatUsers = await this.chatService.getAllChatUsers();
    client.emit('allChatUsers', allChatUsers);
  }

  // 특정 사용자에게 메시지 전송
  async sendMessageToUser(userId: string, event: string, data: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
      return true;
    }
    return false;
  }

  // 브로드캐스트 메시지
  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
```

### 2. 채팅 서비스 구현
```typescript
// chat.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatMessage.name) private chatMessageModel: Model<ChatMessageDocument>,
  ) {}

  async saveMessage(messageData: {
    chatRoomId: string;
    senderId: string;
    message: string;
    messageType: string;
    timestamp: Date;
  }): Promise<ChatMessage> {
    const newMessage = new this.chatMessageModel(messageData);
    return await newMessage.save();
  }

  async getChatHistory(chatRoomId: string, limit: number = 50): Promise<ChatMessage[]> {
    return await this.chatMessageModel
      .find({ chatRoomId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('senderId', 'name email picture')
      .exec();
  }

  async getChatRoomMessages(
    chatRoomId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ messages: ChatMessage[]; totalCount: number }> {
    const skip = (page - 1) * limit;
    
    const [messages, totalCount] = await Promise.all([
      this.chatMessageModel
        .find({ chatRoomId })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('senderId', 'name email picture')
        .exec(),
      this.chatMessageModel.countDocuments({ chatRoomId }),
    ]);

    return { messages: messages.reverse(), totalCount };
  }

  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const message = await this.chatMessageModel.findById(messageId);
    
    if (!message || message.senderId.toString() !== userId) {
      return false;
    }

    await this.chatMessageModel.findByIdAndDelete(messageId);
    return true;
  }

  async getAllChatUsers(): Promise<any[]> {
    const aggregationPipeline = [
      {
        $group: {
          _id: '$senderId',
          lastMessage: { $last: '$message' },
          lastMessageTime: { $last: '$timestamp' },
          messageCount: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userInfo',
        },
      },
      {
        $unwind: '$userInfo',
      },
      {
        $sort: { lastMessageTime: -1 },
      },
    ];

    return await this.chatMessageModel.aggregate(aggregationPipeline);
  }

  async markMessagesAsRead(chatRoomId: string, userId: string): Promise<void> {
    await this.chatMessageModel.updateMany(
      { chatRoomId, senderId: { $ne: userId }, readBy: { $ne: userId } },
      { $addToSet: { readBy: userId } },
    );
  }
}
```

### 3. 메시지 스키마 정의
```typescript
// schemas/chat-message.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatMessageDocument = ChatMessage & Document;

@Schema({ timestamps: true })
export class ChatMessage {
  @Prop({ required: true })
  chatRoomId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  message: string;

  @Prop({ default: 'text', enum: ['text', 'image', 'file', 'system'] })
  messageType: string;

  @Prop({ default: Date.now })
  timestamp: Date;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  readBy: Types.ObjectId[];

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ type: Types.ObjectId, ref: 'ChatMessage' })
  replyTo?: Types.ObjectId;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // 파일 정보, 이미지 크기 등
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

// 인덱스 설정
ChatMessageSchema.index({ chatRoomId: 1, timestamp: -1 });
ChatMessageSchema.index({ senderId: 1 });
```

## SMS 알림 시스템

### 1. SMS 서비스 구현
```typescript
// sms.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as twilio from 'twilio';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly twilioClient: twilio.Twilio;
  private readonly fromNumber: string;

  constructor(
    private configService: ConfigService,
    @InjectModel('SmsLog') private smsLogModel: Model<any>,
  ) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.fromNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER');

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    } else {
      this.logger.warn('Twilio 자격증명이 설정되지 않았습니다.');
    }
  }

  async sendSms(phoneNumber: string, message: string, templateType?: string): Promise<boolean> {
    if (!this.twilioClient) {
      this.logger.error('Twilio 클라이언트가 초기화되지 않았습니다.');
      return false;
    }

    try {
      // 전화번호 형식 변환
      const formattedNumber = this.formatPhoneNumber(phoneNumber);
      
      // SMS 전송
      const result = await this.twilioClient.messages.create({
        body: message,
        from: this.fromNumber,
        to: formattedNumber,
      });

      // 전송 로그 저장
      await this.saveSmsLog({
        phoneNumber: formattedNumber,
        message,
        templateType,
        status: 'sent',
        twilioSid: result.sid,
        timestamp: new Date(),
      });

      this.logger.log(`SMS 전송 성공: ${formattedNumber}`);
      return true;

    } catch (error) {
      this.logger.error(`SMS 전송 실패: ${error.message}`);
      
      // 실패 로그 저장
      await this.saveSmsLog({
        phoneNumber,
        message,
        templateType,
        status: 'failed',
        errorMessage: error.message,
        timestamp: new Date(),
      });

      return false;
    }
  }

  async sendWorkoutReminder(phoneNumber: string, userName: string, workoutType: string): Promise<boolean> {
    const message = `안녕하세요 ${userName}님! 🏃‍♂️\n\n오늘 ${workoutType} 운동 시간입니다.\nFitMate와 함께 건강한 하루 시작하세요!\n\n앱에서 확인: ${this.configService.get('APP_URL')}`;
    
    return await this.sendSms(phoneNumber, message, 'workout_reminder');
  }

  async sendWorkoutRecommendation(phoneNumber: string, userName: string, exercises: string[]): Promise<boolean> {
    const exerciseList = exercises.join(', ');
    const message = `${userName}님을 위한 오늘의 추천 운동 💪\n\n${exerciseList}\n\n지금 시작해보세요!\nFitMate 앱: ${this.configService.get('APP_URL')}`;
    
    return await this.sendSms(phoneNumber, message, 'workout_recommendation');
  }

  async sendOtpCode(phoneNumber: string, otpCode: string): Promise<boolean> {
    const message = `FitMate 인증번호: ${otpCode}\n\n5분 내에 입력해주세요.\n타인에게 알리지 마세요.`;
    
    return await this.sendSms(phoneNumber, message, 'otp_verification');
  }

  async sendCustomMessage(phoneNumber: string, message: string): Promise<boolean> {
    return await this.sendSms(phoneNumber, message, 'custom');
  }

  private formatPhoneNumber(phoneNumber: string): string {
    // 한국 번호 형식 (+82-10-XXXX-XXXX)
    if (phoneNumber.startsWith('010-')) {
      return phoneNumber.replace('010-', '+82-10-');
    }
    
    if (phoneNumber.startsWith('+82')) {
      return phoneNumber;
    }
    
    // 국제 형식이 아닌 경우 한국 번호로 가정
    if (phoneNumber.startsWith('10')) {
      return `+82-${phoneNumber}`;
    }
    
    return phoneNumber;
  }

  private async saveSmsLog(logData: {
    phoneNumber: string;
    message: string;
    templateType?: string;
    status: string;
    twilioSid?: string;
    errorMessage?: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const smsLog = new this.smsLogModel(logData);
      await smsLog.save();
    } catch (error) {
      this.logger.error(`SMS 로그 저장 실패: ${error.message}`);
    }
  }

  async getSmsStatistics(startDate: Date, endDate: Date): Promise<any> {
    return await this.smsLogModel.aggregate([
      {
        $match: {
          timestamp: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
  }
}
```

### 2. SMS 컨트롤러
```typescript
// sms.controller.ts
import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { SmsService } from './sms.service';

@Controller('sms')
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('send')
  async sendSms(@Body() body: { phoneNumber: string; message: string }) {
    const success = await this.smsService.sendSms(body.phoneNumber, body.message);
    return { success, message: success ? 'SMS 전송 성공' : 'SMS 전송 실패' };
  }

  @Post('workout-reminder')
  async sendWorkoutReminder(
    @Body() body: { phoneNumber: string; userName: string; workoutType: string },
  ) {
    const success = await this.smsService.sendWorkoutReminder(
      body.phoneNumber,
      body.userName,
      body.workoutType,
    );
    return { success };
  }

  @Post('workout-recommendation')
  async sendWorkoutRecommendation(
    @Body() body: { phoneNumber: string; userName: string; exercises: string[] },
  ) {
    const success = await this.smsService.sendWorkoutRecommendation(
      body.phoneNumber,
      body.userName,
      body.exercises,
    );
    return { success };
  }

  @Post('request-otp')
  async requestOtp(@Body() body: { phoneNumber: string }) {
    // OTP 코드 생성 (6자리 숫자)
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Redis에 OTP 저장 (5분 만료)
    await this.cacheService.set(`otp:${body.phoneNumber}`, otpCode, 300);
    
    const success = await this.smsService.sendOtpCode(body.phoneNumber, otpCode);
    return { success };
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { phoneNumber: string; otpCode: string }) {
    const storedOtp = await this.cacheService.get(`otp:${body.phoneNumber}`);
    
    if (storedOtp === body.otpCode) {
      await this.cacheService.del(`otp:${body.phoneNumber}`);
      return { success: true, message: '인증 성공' };
    }
    
    return { success: false, message: '인증번호가 일치하지 않습니다.' };
  }

  @Get('statistics')
  async getSmsStatistics(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return await this.smsService.getSmsStatistics(start, end);
  }
}
```

## 알림 시스템

### 1. 알림 서비스 구현
```typescript
// notifications.service.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { CommunicationGateway } from '../communication/communication.gateway';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(Notification.name) private notificationModel: Model<NotificationDocument>,
    private communicationGateway: CommunicationGateway,
  ) {}

  async createNotification(notificationData: {
    userId: string;
    title: string;
    message: string;
    type: string;
    data?: any;
  }): Promise<Notification> {
    const notification = new this.notificationModel({
      ...notificationData,
      createdAt: new Date(),
      isRead: false,
    });

    const savedNotification = await notification.save();

    // 실시간으로 사용자에게 알림 전송
    const sent = await this.communicationGateway.sendMessageToUser(
      notificationData.userId,
      'newNotification',
      savedNotification,
    );

    // 사용자가 오프라인인 경우 푸시 알림 처리
    if (!sent) {
      await this.handleOfflineNotification(savedNotification);
    }

    return savedNotification;
  }

  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ notifications: Notification[]; totalCount: number; unreadCount: number }> {
    const skip = (page - 1) * limit;

    const [notifications, totalCount, unreadCount] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.notificationModel.countDocuments({ userId }),
      this.notificationModel.countDocuments({ userId, isRead: false }),
    ]);

    return { notifications, totalCount, unreadCount };
  }

  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.updateOne(
      { _id: notificationId, userId },
      { isRead: true, readAt: new Date() },
    );

    if (result.modifiedCount > 0) {
      // 읽지 않은 알림 수 업데이트
      const unreadCount = await this.getUnreadCount(userId);
      await this.communicationGateway.sendMessageToUser(
        userId,
        'unreadNotificationCount',
        unreadCount,
      );
      return true;
    }

    return false;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await this.notificationModel.updateMany(
      { userId, isRead: false },
      { isRead: true, readAt: new Date() },
    );

    if (result.modifiedCount > 0) {
      await this.communicationGateway.sendMessageToUser(
        userId,
        'unreadNotificationCount',
        0,
      );
    }

    return result.modifiedCount;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await this.notificationModel.countDocuments({ userId, isRead: false });
  }

  async deleteNotification(notificationId: string, userId: string): Promise<boolean> {
    const result = await this.notificationModel.deleteOne({
      _id: notificationId,
      userId,
    });

    return result.deletedCount > 0;
  }

  // 운동 관련 알림 생성
  async createWorkoutNotification(userId: string, workoutData: any): Promise<void> {
    await this.createNotification({
      userId,
      title: '운동 완료! 🎉',
      message: `${workoutData.exerciseName} 운동을 완료했습니다. 총 ${workoutData.duration}분 동안 ${workoutData.calories}칼로리를 소모했어요!`,
      type: 'workout_completed',
      data: workoutData,
    });
  }

  // 목표 달성 알림
  async createGoalAchievementNotification(userId: string, goalData: any): Promise<void> {
    await this.createNotification({
      userId,
      title: '목표 달성! 🏆',
      message: `${goalData.goalName} 목표를 달성했습니다! 축하드려요!`,
      type: 'goal_achieved',
      data: goalData,
    });
  }

  // 운동 리마인더 알림
  async createWorkoutReminderNotification(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      title: '운동 시간이에요! ⏰',
      message: '오늘의 운동을 시작해보세요. 건강한 하루를 만들어가요!',
      type: 'workout_reminder',
    });
  }

  private async handleOfflineNotification(notification: Notification): Promise<void> {
    // 모바일 푸시 알림 처리 (FCM 등)
    // 이메일 알림 처리
    // SMS 알림 처리 (중요한 알림의 경우)
    console.log('오프라인 사용자 알림 처리:', notification);
  }
}
```

### 2. 알림 스키마
```typescript
// schemas/notification.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ 
    required: true,
    enum: ['workout_completed', 'goal_achieved', 'workout_reminder', 'chat_message', 'system', 'custom']
  })
  type: string;

  @Prop({ type: Object })
  data?: Record<string, any>;

  @Prop({ default: false })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop()
  expiresAt?: Date;

  @Prop({ default: 'normal', enum: ['low', 'normal', 'high', 'urgent'] })
  priority: string;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// 인덱스 설정
NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });
NotificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
```

## 스케줄러 시스템

### 1. 스케줄링 서비스
```typescript
// scheduler.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SmsService } from '../sms/sms.service';
import { NotificationService } from '../notifications/notifications.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly smsService: SmsService,
    private readonly notificationService: NotificationService,
  ) {}

  // 매일 오전 9시 운동 리마인더
  @Cron('0 9 * * *')
  async sendDailyWorkoutReminders() {
    this.logger.log('일일 운동 리마인더 시작');
    
    try {
      // 활성 사용자 목록 조회
      const activeUsers = await this.getActiveUsersForReminder();
      
      for (const user of activeUsers) {
        // 앱 내 알림
        await this.notificationService.createWorkoutReminderNotification(user.id);
        
        // SMS 알림 (설정한 사용자만)
        if (user.smsNotificationEnabled && user.phoneNumber) {
          await this.smsService.sendWorkoutReminder(
            user.phoneNumber,
            user.name,
            '오늘의 운동'
          );
        }
      }
      
      this.logger.log(`${activeUsers.length}명에게 운동 리마인더 전송 완료`);
    } catch (error) {
      this.logger.error('운동 리마인더 전송 실패:', error);
    }
  }

  // 매주 일요일 오후 6시 주간 리포트
  @Cron('0 18 * * 0')
  async sendWeeklyReports() {
    this.logger.log('주간 리포트 생성 시작');
    
    try {
      const users = await this.getActiveUsers();
      
      for (const user of users) {
        const weeklyStats = await this.generateWeeklyStats(user.id);
        
        await this.notificationService.createNotification({
          userId: user.id,
          title: '주간 운동 리포트 📊',
          message: `이번 주 ${weeklyStats.workoutDays}일 운동했어요! 총 ${weeklyStats.totalCalories}칼로리 소모!`,
          type: 'weekly_report',
          data: weeklyStats,
        });
      }
      
      this.logger.log('주간 리포트 생성 완료');
    } catch (error) {
      this.logger.error('주간 리포트 생성 실패:', error);
    }
  }

  // 매 시간 목표 체크 및 알림
  @Cron(CronExpression.EVERY_HOUR)
  async checkGoalAchievements() {
    this.logger.log('목표 달성 체크 시작');
    
    try {
      const achievements = await this.checkUserGoalAchievements();
      
      for (const achievement of achievements) {
        await this.notificationService.createGoalAchievementNotification(
          achievement.userId,
          achievement.goalData
        );
      }
      
      this.logger.log(`${achievements.length}개 목표 달성 알림 전송`);
    } catch (error) {
      this.logger.error('목표 달성 체크 실패:', error);
    }
  }

  // 매일 자정 데이터 정리
  @Cron('0 0 * * *')
  async cleanupOldData() {
    this.logger.log('오래된 데이터 정리 시작');
    
    try {
      // 30일 이상 된 읽은 알림 삭제
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await this.notificationService.deleteOldNotifications(thirtyDaysAgo);
      
      // 90일 이상 된 채팅 메시지 아카이브
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      await this.archiveOldChatMessages(ninetyDaysAgo);
      
      this.logger.log('데이터 정리 완료');
    } catch (error) {
      this.logger.error('데이터 정리 실패:', error);
    }
  }

  private async getActiveUsersForReminder(): Promise<any[]> {
    // 최근 7일 내 활동한 사용자
    // 실제로는 메인 백엔드 API를 호출하거나 데이터베이스에서 조회
    return [];
  }

  private async generateWeeklyStats(userId: string): Promise<any> {
    // 주간 운동 통계 생성
    return {
      workoutDays: 5,
      totalCalories: 1200,
      totalWorkouts: 7,
      averageWorkoutTime: 45,
    };
  }

  private async checkUserGoalAchievements(): Promise<any[]> {
    // 사용자 목표 달성 체크
    return [];
  }

  private async archiveOldChatMessages(date: Date): Promise<void> {
    // 오래된 채팅 메시지 아카이브
  }
}
```

## 프론트엔드 WebSocket 클라이언트

### 1. Socket 컨텍스트
```typescript
// context/SocketContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinChat: (chatRoomId: string) => void;
  sendMessage: (chatRoomId: string, message: string) => void;
  notifications: any[];
  unreadCount: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io('http://localhost:3000', {
      auth: { token },
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('WebSocket 연결됨');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('WebSocket 연결 해제됨');
    });

    newSocket.on('newNotification', (notification) => {
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    newSocket.on('unreadNotificationCount', (count) => {
      setUnreadCount(count);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const joinChat = (chatRoomId: string) => {
    if (socket) {
      socket.emit('joinChat', { chatRoomId });
    }
  };

  const sendMessage = (chatRoomId: string, message: string) => {
    if (socket) {
      socket.emit('sendMessage', { chatRoomId, message });
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinChat,
        sendMessage,
        notifications,
        unreadCount,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
```

## 면접 예상 질문 대비

### Q1: WebSocket과 HTTP의 차이점과 선택 이유는?
**A:**
- **연결 방식**: HTTP는 요청-응답, WebSocket은 양방향 지속 연결
- **실시간성**: WebSocket이 낮은 지연시간으로 실시간 통신 가능
- **오버헤드**: WebSocket은 연결 후 헤더 오버헤드가 적음
- **사용 사례**: 채팅, 실시간 알림에 WebSocket이 적합

### Q2: Socket.IO를 선택한 이유는?
**A:**
- **호환성**: 브라우저 호환성과 자동 폴백 지원
- **기능 풍부**: 룸, 네임스페이스, 자동 재연결 등 기본 제공
- **안정성**: 연결 끊김 시 자동 복구 메커니즘
- **생태계**: Node.js와 React에서 널리 사용되는 검증된 라이브러리

### Q3: 대용량 동시 접속 시 성능 최적화 방안은?
**A:**
- **클러스터링**: Redis Adapter로 다중 서버 인스턴스 지원
- **메시지 큐**: 무거운 작업을 백그라운드로 분리
- **연결 관리**: 비활성 연결 자동 정리
- **로드 밸런싱**: Sticky Session으로 WebSocket 연결 유지

### Q4: SMS 전송 실패 시 처리 방법은?
**A:**
- **재시도 로직**: 지수 백오프로 점진적 재시도
- **대체 수단**: 앱 내 알림으로 폴백
- **모니터링**: 실패율 추적 및 알람
- **사용자 알림**: 전송 실패 시 사용자에게 안내

## 향후 개발 계획

### 1. 성능 최적화
- **Redis Cluster**: 분산 세션 관리
- **메시지 큐**: RabbitMQ/Apache Kafka 도입
- **로드 밸런서**: Nginx upstream 설정

### 2. 기능 확장
- **모바일 푸시**: FCM 통합
- **이메일 알림**: SendGrid 연동
- **음성/영상 통화**: WebRTC 구현

### 3. 모니터링 강화
- **실시간 대시보드**: 연결 상태, 메시지 처리량
- **알림 분석**: 전송률, 읽음률 통계
- **성능 지표**: 응답 시간, 에러율 추적

---

*이 문서는 FitMate 프로젝트의 실시간 통신 및 알림 시스템에 대한 상세 분석을 제공합니다.*