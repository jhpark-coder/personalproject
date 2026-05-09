import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { CommunicationGateway } from '../communication/communication.gateway';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthService } from '../shared/auth/jwt-auth.service';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let communicationGateway: CommunicationGateway;
  let notificationsService: NotificationsService;
  let jwtAuthService: JwtAuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: CommunicationGateway,
          useValue: {
            sendNotificationToUser: jest.fn(),
            sendNotificationToAdminGroup: jest.fn(),
            broadcastNotification: jest.fn(),
          },
        },
        {
          provide: NotificationsService,
          useValue: {
            createNotification: jest.fn(),
            getUserNotifications: jest.fn(),
            getNotification: jest.fn(),
            markAsRead: jest.fn(),
            getUnreadCount: jest.fn(),
          },
        },
        {
          provide: JwtAuthService,
          useValue: {
            requireAdmin: jest.fn(),
            requireUserAccess: jest.fn(),
            requireIdentity: jest.fn().mockReturnValue({
              userId: '1',
              roles: ['ROLE_USER'],
            }),
            canAccessUser: jest.fn().mockReturnValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    communicationGateway =
      module.get<CommunicationGateway>(CommunicationGateway);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);
    jwtAuthService = module.get<JwtAuthService>(JwtAuthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create notification and send via WebSocket', async () => {
      // given
      const createNotificationDto: CreateNotificationDto = {
        senderUserId: 1,
        targetUserId: 2,
        message: 'Test notification',
        type: 'TEST',
        category: 'SOCIAL',
      };

      const savedNotification = {
        _id: 'test-id',
        ...createNotificationDto,
        isRead: false,
        createdAt: new Date(),
      };

      jest
        .spyOn(notificationsService, 'createNotification')
        .mockResolvedValue(savedNotification as any);
      jest
        .spyOn(communicationGateway, 'sendNotificationToUser')
        .mockImplementation();

      // when
      const result = await controller.createNotification(
        createNotificationDto,
        'Bearer token',
      );

      // then
      expect(jwtAuthService.requireAdmin).toHaveBeenCalledWith(
        'Bearer token',
        undefined,
      );
      expect(notificationsService.createNotification).toHaveBeenCalledWith(
        createNotificationDto,
      );
      expect(communicationGateway.sendNotificationToUser).toHaveBeenCalledWith(
        '2',
        savedNotification,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getUserNotifications', () => {
    it('should return user notifications', async () => {
      // given
      const userId = 1;
      const mockNotifications = [
        { _id: '1', message: 'Test 1', isRead: false },
        { _id: '2', message: 'Test 2', isRead: true },
      ];

      jest
        .spyOn(notificationsService, 'getUserNotifications')
        .mockResolvedValue(mockNotifications as any);

      // when
      const result = await controller.getUserNotifications(
        userId,
        'Bearer token',
      );

      // then
      expect(jwtAuthService.requireUserAccess).toHaveBeenCalledWith(
        'Bearer token',
        undefined,
        userId,
      );
      expect(notificationsService.getUserNotifications).toHaveBeenCalledWith(
        userId,
      );
      expect(result.notifications).toEqual(mockNotifications);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      // given
      const notificationId = 'test-id';
      jest
        .spyOn(notificationsService, 'getNotification')
        .mockResolvedValue({ targetUserId: 1 } as any);
      jest.spyOn(notificationsService, 'markAsRead').mockResolvedValue();

      // when
      const result = await controller.markAsRead(
        notificationId,
        'Bearer token',
      );

      // then
      expect(jwtAuthService.requireIdentity).toHaveBeenCalledWith(
        'Bearer token',
        undefined,
      );
      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        notificationId,
      );
      expect(result.success).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      // given
      const userId = 1;
      const unreadCount = 5;
      jest
        .spyOn(notificationsService, 'getUnreadCount')
        .mockResolvedValue(unreadCount);

      // when
      const result = await controller.getUnreadCount(userId, 'Bearer token');

      // then
      expect(jwtAuthService.requireUserAccess).toHaveBeenCalledWith(
        'Bearer token',
        undefined,
        userId,
      );
      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(userId);
      expect(result.unreadCount).toBe(unreadCount);
    });
  });
});
