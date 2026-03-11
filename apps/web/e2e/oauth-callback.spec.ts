import { expect, test } from '@playwright/test';

import { createFakeJwt } from './support/auth';
import { mockCalendarApis, mockProfileApi } from './support/session';

test.describe('OAuth callback', () => {
  test('calendar-only callback stores auth state and redirects to calendar', async ({ page }) => {
    const token = createFakeJwt({
      userId: 11,
      sub: '11',
      role: 'ROLE_USER',
      email: 'calendar-user@fitmate.test',
    });

    await mockCalendarApis(page, false);
    await mockProfileApi(page);

    await page.goto(
      `/#/auth/callback?success=true&token=${token}&provider=google&calendarOnly=true`,
    );

    await expect(page).toHaveURL(/#\/calendar$/);
    await expect(page.getByRole('heading', { name: 'Google Calendar 연동' })).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          currentProvider: window.localStorage.getItem('currentProvider'),
          onboardingCompleted: window.localStorage.getItem('onboardingCompleted'),
          token: window.localStorage.getItem('token'),
        })),
      )
      .toEqual({
        currentProvider: 'google',
        onboardingCompleted: 'true',
        token,
      });
  });

  test('new user callback keeps onboarding incomplete and redirects to onboarding', async ({ page }) => {
    const token = createFakeJwt({
      userId: 12,
      sub: '12',
      role: 'ROLE_USER',
      email: 'new-user@fitmate.test',
    });

    await mockProfileApi(page, {
      id: 12,
      email: 'new-user@fitmate.test',
      name: 'New User',
      provider: 'kakao',
      role: 'ROLE_USER',
    });

    await page.goto(
      `/#/auth/callback?success=true&token=${token}&provider=kakao&isNewUser=true`,
    );

    await expect(page).toHaveURL(/#\/onboarding\/experience$/);
    await expect(page.getByText('운동 경험이 어느 정도인가요?')).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          currentProvider: window.localStorage.getItem('currentProvider'),
          onboardingCompleted: window.localStorage.getItem('onboardingCompleted'),
          token: window.localStorage.getItem('token'),
        })),
      )
      .toEqual({
        currentProvider: 'kakao',
        onboardingCompleted: null,
        token,
      });
  });
});
