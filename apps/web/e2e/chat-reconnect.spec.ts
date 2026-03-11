import { expect, test } from '@playwright/test';

import { MockCommunicationServer } from './support/mockCommunicationServer';
import { installAuthenticatedSession } from './support/session';

test.describe('Chat reconnect flow', () => {
  const mockServer = new MockCommunicationServer();

  test.beforeAll(async () => {
    mockServer.setAdminOnline(true);
    await mockServer.start(4010);
  });

  test.afterAll(async () => {
    await mockServer.stop();
  });

  test('reconnects after server restart and receives admin reply again', async ({ page }) => {
    await installAuthenticatedSession(page);

    await page.goto('/#/chat');

    await expect(page.getByText('관리자 온라인')).toBeVisible();
    await expect(page.getByText('연결 중...')).toBeHidden();

    await mockServer.stop();

    await expect(page.getByText('연결 중...')).toBeVisible({ timeout: 10_000 });

    await mockServer.start(4010);
    mockServer.setAdminOnline(true);

    await expect(page.getByText('연결 중...')).toBeHidden({ timeout: 20_000 });

    mockServer.emitAdminReply('사용자_1', {
      sender: '관리자',
      content: '재연결 후 관리자 응답',
      type: 'CHAT',
      timestamp: new Date().toISOString(),
    });

    await expect(page.getByText('재연결 후 관리자 응답')).toBeVisible({ timeout: 10_000 });
  });
});
