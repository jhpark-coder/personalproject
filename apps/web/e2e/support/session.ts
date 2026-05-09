import type { Page, Route } from '@playwright/test';

export interface MockUserProfile {
  age?: string;
  birthDate?: string;
  email: string;
  gender?: string;
  height?: string;
  id: number;
  name: string;
  phoneNumber?: string;
  picture?: string;
  provider?: string;
  role?: string;
  weight?: string;
}

export const defaultUserProfile: MockUserProfile = {
  id: 1,
  email: 'member@fitmate.test',
  name: 'FitMate Member',
  provider: 'local',
  role: 'ROLE_USER',
  height: '175',
  weight: '70',
  age: '29',
  gender: 'male',
  phoneNumber: '010-1234-5678',
  birthDate: '19970115',
};

const fulfillJson = async (route: Route, body: unknown) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
};

export const mockProfileApi = async (
  page: Page,
  profile: MockUserProfile = defaultUserProfile,
) => {
  await page.route('**/api/auth/profile', async (route) => {
    await fulfillJson(route, {
      success: true,
      user: profile,
    });
  });
};

export const installAuthenticatedSession = async (
  page: Page,
  profile: MockUserProfile = defaultUserProfile,
) => {
  await page.addInitScript(
    ({ provider }) => {
      window.localStorage.setItem('authSession', 'true');
      window.localStorage.setItem('currentProvider', provider);
      window.localStorage.setItem('onboardingCompleted', 'true');
    },
    {
      provider: profile.provider ?? 'local',
    },
  );

  await mockProfileApi(page, profile);
};

export const mockCalendarApis = async (page: Page, connected = false) => {
  await page.route('**/api/calendar/status', async (route) => {
    await fulfillJson(route, { connected });
  });

  await page.route('**/api/calendar/events**', async (route) => {
    await fulfillJson(route, []);
  });

  await page.route('**/api/mypage/*/workouts', async (route) => {
    await fulfillJson(route, { workouts: [] });
  });

  await page.route('https://date.nager.at/api/v3/PublicHolidays/**', async (route) => {
    await fulfillJson(route, []);
  });
};
