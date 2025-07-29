import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotificationsService } from './notifications.service';
import { Notification } from '../schemas/notification.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationModel: any;

  beforeEach(async () => {
    const mockNotification = {
      save: jest.fn().mockResolvedValue({
        toObject: () => ({ id: 'test', message: 'test' }),
      }),
    };

    mockNotificationModel = jest.fn().mockImplementation(() => mockNotification);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: getModelToken(Notification.name),
          useValue: mockNotificationModel,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification', async () => {
      // given
      const createNotificationDto: CreateNotificationDto = {
        senderUserId: 1,
        targetUserId: 2,
        message: 'Test notification',
        type: 'TEST',
        category: 'SOCIAL',
      };

      // when
      const result = await service.createNotification(createNotificationDto);

      // then
      expect(mockNotificationModel).toHaveBeenCalledWith({
        ...createNotificationDto,
        isRead: false,
        createdAt: expect.any(Date),
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      // given
      const userId = 1;
      const mockNotifications = [
        { id: '1', message: 'Test 1', isRead: false },
        { id: '2', message: 'Test 2', isRead: true },
      ];

      mockNotificationModel.find = jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockNotifications),
        }),
      });

      // when
      const result = await service.getUserNotifications(userId);

      // then
      expect(mockNotificationModel.find).toHaveBeenCalledWith({ targetUserId: userId });
      expect(result).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      // given
      const notificationId = 'test-id';
      mockNotificationModel.findByIdAndUpdate = jest.fn().mockResolvedValue({});

      // when
      await service.markAsRead(notificationId);

      // then
      expect(mockNotificationModel.findByIdAndUpdate).toHaveBeenCalledWith(notificationId, { isRead: true });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      // given
      const userId = 1;
      const unreadCount = 5;

      mockNotificationModel.countDocuments = jest.fn().mockResolvedValue(unreadCount);

      // when
      const result = await service.getUnreadCount(userId);

      // then
      expect(mockNotificationModel.countDocuments).toHaveBeenCalledWith({
        targetUserId: userId,
        isRead: false,
      });
      expect(result).toBe(unreadCount);
    });
  });
});
