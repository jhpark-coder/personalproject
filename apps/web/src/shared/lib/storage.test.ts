import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAuthSession,
  consumeJustSignedUp,
  getAuthToken,
  getCurrentProvider,
  getProviderOnboardingKey,
  hasAuthSession,
  isOnboardingCompleted,
  isProviderOnboardingCompleted,
  markJustSignedUp,
  setAuthSession,
  setAuthToken,
  setCurrentProvider,
  setOnboardingCompleted,
  setProviderOnboardingCompleted,
} from './storage';

const createLocalStorageMock = () => {
  const values = new Map<string, string>();

  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      values.set(key, value);
      Object.defineProperty(localStorageMock, key, {
        configurable: true,
        enumerable: true,
        value,
      });
    }),
    removeItem: vi.fn((key: string) => {
      values.delete(key);
      delete (localStorageMock as Record<string, unknown>)[key];
    }),
    clear: vi.fn(() => {
      values.forEach((_value, key) => {
        delete (localStorageMock as Record<string, unknown>)[key];
      });
      values.clear();
    }),
  };
};

let localStorageMock: ReturnType<typeof createLocalStorageMock>;

describe('storage auth and onboarding state', () => {
  beforeEach(() => {
    localStorageMock = createLocalStorageMock();
    vi.stubGlobal('window', { localStorage: localStorageMock });
  });

  it('uses an auth session marker without persisting raw JWTs', () => {
    localStorageMock.setItem('token', 'legacy-token');

    setAuthToken('new-token-that-should-not-be-stored');

    expect(getAuthToken()).toBeNull();
    expect(hasAuthSession()).toBe(true);
    expect(localStorageMock.getItem('authSession')).toBe('true');
    expect(localStorageMock.getItem('token')).toBeNull();
  });

  it('ignores legacy JWT storage when deciding if the user is authenticated', () => {
    localStorageMock.setItem('token', 'legacy-token');

    expect(getAuthToken()).toBeNull();
    expect(hasAuthSession()).toBe(false);
  });

  it('clears auth and onboarding state together', () => {
    setAuthSession();
    setCurrentProvider('google');
    markJustSignedUp();
    setOnboardingCompleted(true);
    setProviderOnboardingCompleted('google', true);

    clearAuthSession();

    expect(hasAuthSession()).toBe(false);
    expect(getCurrentProvider()).toBeNull();
    expect(consumeJustSignedUp()).toBe(false);
    expect(isOnboardingCompleted()).toBe(false);
    expect(isProviderOnboardingCompleted('google')).toBe(false);
    expect(localStorageMock.getItem(getProviderOnboardingKey('google'))).toBeNull();
  });

  it('consumes the just-signed-up marker only once', () => {
    markJustSignedUp();

    expect(consumeJustSignedUp()).toBe(true);
    expect(consumeJustSignedUp()).toBe(false);
  });
});
