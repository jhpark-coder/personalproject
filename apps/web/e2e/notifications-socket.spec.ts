import { expect, test } from '@playwright/test';

import { installNotificationMock } from './support/browserMocks';
import { MockCommunicationServer, type MockNotification } from './support/mockCommunicationServer';
import { installAuthenticatedSession } from './support/session';

test.describe('Notification socket flow', () => {
  const mockServer = new MockCommunicationServer();

  test.beforeAll(async () => {
    await mockServer.start(4010);
  });

  test.afterAll(async () => {
    await mockServer.stop();
  });

  test.beforeEach(() => {
    mockServer.seedNotifications([]);
  });

  test('merges duplicate notification ids coming from socket and broadcast', async ({ page }) => {
    await installNotificationMock(page, { permission: 'denied' });
    await installAuthenticatedSession(page);

    await page.goto('/#/notifications');
    await expect(page.getByText('새로운 알림이 없습니다')).toBeVisible();

    const notification: MockNotification = {
      _id: 'notif-dedupe-1',
      senderUserId: 99,
      targetUserId: 1,
      message: '중복 없이 하나만 보여야 하는 알림',
      type: 'admin_message',
      category: 'ADMIN',
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    mockServer.emitNotification(notification);
    mockServer.emitBroadcastNotification(notification);

    await expect(page.locator('.notification-item')).toHaveCount(1);
    await expect(page.getByText(notification.message)).toBeVisible();
    await expect(page.getByLabel('읽지 않은 알림 1개')).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(
          () =>
            (
              window as typeof window & {
                __notificationTestState?: { shown?: Array<{ title: string }> };
              }
            ).__notificationTestState?.shown?.length ?? 0,
        ),
      )
      .toBe(0);
  });
});
