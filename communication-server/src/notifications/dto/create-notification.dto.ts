export type NotificationCategory = 'SOCIAL' | 'AUCTION' | 'ORDER' | 'ADMIN';

export class CreateNotificationDto {
    senderUserId: number;
    targetUserId: number;
    message: string;
    type: string;
    category: NotificationCategory;
    link?: string;
} 