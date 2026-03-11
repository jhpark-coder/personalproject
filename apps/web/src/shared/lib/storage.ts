const STORAGE_KEYS = {
  token: 'token',
  user: 'user',
  currentProvider: 'currentProvider',
  onboardingCompleted: 'onboardingCompleted',
  justSignedUp: 'justSignedUp',
} as const;

const hasStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const read = (key: string): string | null => {
  if (!hasStorage()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
};

const remove = (key: string) => {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage quota or privacy mode failures.
  }
};

const getKeys = (): string[] => {
  if (!hasStorage()) return [];
  try {
    return Object.keys(window.localStorage);
  } catch {
    return [];
  }
};

export const getAuthToken = () => read(STORAGE_KEYS.token);

export const setAuthToken = (token: string) => {
  write(STORAGE_KEYS.token, token);
};

export const setStoredUser = (user: unknown) => {
  try {
    write(STORAGE_KEYS.user, JSON.stringify(user));
  } catch {
    // Ignore serialization/storage failures.
  }
};

export const getCurrentProvider = () => read(STORAGE_KEYS.currentProvider);

export const setCurrentProvider = (provider: string) => {
  write(STORAGE_KEYS.currentProvider, provider);
};

export const isOnboardingCompleted = () => read(STORAGE_KEYS.onboardingCompleted) === 'true';

export const setOnboardingCompleted = (completed: boolean) => {
  if (completed) {
    write(STORAGE_KEYS.onboardingCompleted, 'true');
    return;
  }
  remove(STORAGE_KEYS.onboardingCompleted);
};

export const getProviderOnboardingKey = (provider: string) => `onboardingCompleted_${provider}`;

export const isProviderOnboardingCompleted = (provider: string | null) => {
  if (!provider) return false;
  return read(getProviderOnboardingKey(provider)) === 'true';
};

export const setProviderOnboardingCompleted = (provider: string | null, completed: boolean) => {
  if (!provider) return;
  const key = getProviderOnboardingKey(provider);
  if (completed) {
    write(key, 'true');
    return;
  }
  remove(key);
};

export const markJustSignedUp = () => {
  write(STORAGE_KEYS.justSignedUp, 'true');
};

export const consumeJustSignedUp = () => {
  const shouldRedirect = read(STORAGE_KEYS.justSignedUp) === 'true';
  if (shouldRedirect) {
    remove(STORAGE_KEYS.justSignedUp);
  }
  return shouldRedirect;
};

export const clearOnboardingFlags = () => {
  remove(STORAGE_KEYS.onboardingCompleted);
  getKeys().forEach((key) => {
    if (key.startsWith('onboardingCompleted_')) {
      remove(key);
    }
  });
};

export const clearAuthSession = () => {
  remove(STORAGE_KEYS.token);
  remove(STORAGE_KEYS.user);
  remove(STORAGE_KEYS.currentProvider);
  remove(STORAGE_KEYS.justSignedUp);
  clearOnboardingFlags();
};
