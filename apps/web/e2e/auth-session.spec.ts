import { expect, test } from '@playwright/test';

test.describe('Auth session state', () => {
  test('clears stale auth state and redirects to login when the profile session expires', async ({
    page,
  }) => {
    await page.route('**/api/auth/profile', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, message: 'unauthorized' }),
      });
    });

    await page.addInitScript(() => {
      window.localStorage.setItem('authSession', 'true');
      window.localStorage.setItem('currentProvider', 'google');
      window.localStorage.setItem('user', JSON.stringify({ id: 1 }));
      window.localStorage.setItem('justSignedUp', 'true');
      window.localStorage.setItem('onboardingCompleted', 'true');
      window.localStorage.setItem('onboardingCompleted_google', 'true');
    });

    await page.goto('/#/');

    await expect(page).toHaveURL(/#\/login$/);
    await expect
      .poll(async () =>
        page.evaluate(() => ({
          authSession: window.localStorage.getItem('authSession'),
          currentProvider: window.localStorage.getItem('currentProvider'),
          justSignedUp: window.localStorage.getItem('justSignedUp'),
          onboardingCompleted: window.localStorage.getItem('onboardingCompleted'),
          providerOnboarding: window.localStorage.getItem('onboardingCompleted_google'),
          user: window.localStorage.getItem('user'),
        })),
      )
      .toEqual({
        authSession: null,
        currentProvider: null,
        justSignedUp: null,
        onboardingCompleted: null,
        providerOnboarding: null,
        user: null,
      });
  });
});
