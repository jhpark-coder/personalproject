import { expect, test } from '@playwright/test';

import { MockCommunicationServer } from './support/mockCommunicationServer';

test.describe('Onboarding OTP', () => {
  const mockServer = new MockCommunicationServer();

  test.beforeAll(async () => {
    await mockServer.start(4010);
  });

  test.afterAll(async () => {
    await mockServer.stop();
  });

  test('requests OTP, rejects wrong code, and verifies the right code', async ({ page }) => {
    await page.goto('/#/onboarding/basic-info');

    await page.getByPlaceholder('예: 010-1234-5678').fill('010-1234-5678');
    await page.getByRole('button', { name: 'SMS 인증' }).click();

    await expect(page.getByText('SMS 인증 코드가 발송되었습니다.')).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();

    await expect(page.getByPlaceholder('SMS 인증 코드 6자리')).toBeVisible();
    await expect(page.getByText('인증번호를 발송했습니다. 인증 문자가 오지 않으면 시간연장을 눌러주세요.')).toBeVisible();

    await page.getByPlaceholder('SMS 인증 코드 6자리').fill('000000');
    await page.getByRole('button', { name: '인증하기' }).click();

    await expect(page.getByText('인증 코드가 올바르지 않습니다.')).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();

    await page.getByPlaceholder('SMS 인증 코드 6자리').fill('123456');
    await page.getByRole('button', { name: '인증하기' }).click();

    await expect(page.getByText('전화번호 인증이 완료되었습니다!')).toBeVisible();
    await page.getByRole('button', { name: '확인' }).click();

    await expect(page.getByRole('button', { name: '인증완료' })).toBeVisible();
    await expect(page.getByText('전화번호 인증이 완료되었습니다.')).toBeVisible();
  });
});
