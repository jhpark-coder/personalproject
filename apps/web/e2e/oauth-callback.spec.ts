import { expect, test } from '@playwright/test';

import { mockCalendarApis, mockProfileApi } from './support/session';

test.describe('OAuth callback', () => {
  test('calendar-only callback stores auth state and redirects to calendar', async ({ page }) => {
    await mockCalendarApis(page, false);
    await mockProfileApi(page);

    await page.goto(
      '/#/auth/callback?success=true&provider=google&calendarOnly=true',
    );

    await expect(page).toHaveURL(/#\/calendar$/);
    await expect(page.getByRole('heading', { name: 'Google Calendar 연동' })).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          currentProvider: window.localStorage.getItem('currentProvider'),
          onboardingCompleted: window.localStorage.getItem('onboardingCompleted'),
          authSession: window.localStorage.getItem('authSession'),
        })),
      )
      .toEqual({
        currentProvider: 'google',
        onboardingCompleted: 'true',
        authSession: 'true',
      });
  });

  test('new user callback keeps onboarding incomplete and redirects to onboarding', async ({ page }) => {
    await mockProfileApi(page, {
      id: 12,
      email: 'new-user@fitmate.test',
      name: 'New User',
      provider: 'kakao',
      role: 'ROLE_USER',
    });

    await page.goto(
      '/#/auth/callback?success=true&provider=kakao&isNewUser=true',
    );

    await expect(page).toHaveURL(/#\/onboarding\/experience$/);
    await expect(page.getByText('운동 경험이 어느 정도인가요?')).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          currentProvider: window.localStorage.getItem('currentProvider'),
          onboardingCompleted: window.localStorage.getItem('onboardingCompleted'),
          authSession: window.localStorage.getItem('authSession'),
        })),
      )
      .toEqual({
        currentProvider: 'kakao',
        onboardingCompleted: null,
        authSession: 'true',
      });
  });
});
