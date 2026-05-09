import React, { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { API_ENDPOINTS } from '../../shared/config/api';
import { authFetch } from '../../shared/lib/http';
import {
  clearAuthSession,
  getAuthToken,
  getCurrentProvider,
  hasAuthSession,
  setStoredUser,
} from '../../shared/lib/storage';
import { logger } from '../../shared/lib/logger';
import {
  UserContext,
  type LoginUserData,
  type UserContextValue,
  type UserData,
} from './userContext.shared';
import { useUserSessionStore } from './userSessionStore';

interface ProfilePayload extends Partial<UserData> {
  id?: number;
  role?: string;
}

interface ProfileResponse {
  success?: boolean;
  message?: string;
  user?: ProfilePayload;
}

const LOGIN_REQUIRED_MESSAGE = '로그인이 필요합니다.';

function decodeJwtRole(token: string | null): string | undefined {
  try {
    if (!token) return undefined;
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch (e) {
    logger.warn('JWT decode failed', e);
    return undefined;
  }
}

const normalizeUser = (source: ProfilePayload, fallbackProvider: string | null, token?: string | null): UserData => ({
  id: source.id ?? 0,
  email: source.email ?? '',
  name: source.name ?? '',
  provider: source.provider ?? fallbackProvider ?? 'local',
  picture: source.picture ?? '',
  height: source.height ?? '',
  weight: source.weight ?? '',
  age: source.age ?? '',
  gender: source.gender ?? '',
  phoneNumber: source.phoneNumber ?? '',
  birthDate: source.birthDate ?? '',
  role: source.role ?? decodeJwtRole(token ?? null),
});

const fetchProfile = async (signal: AbortSignal): Promise<UserData> => {
  const token = getAuthToken();
  const currentProvider = getCurrentProvider();

  logger.debug('fetchProfile start:', { hasToken: !!token, currentProvider });

  if (!hasAuthSession()) throw new Error(LOGIN_REQUIRED_MESSAGE);

  const res = await authFetch(API_ENDPOINTS.PROFILE, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    signal,
  });

  logger.debug('Profile API response:', res.status, res.statusText);

  if (res.status === 429) {
    throw new Error('RATE_LIMIT');
  }

  if (res.status === 401 || res.status === 403) {
    throw new Error('UNAUTHENTICATED');
  }

  if (!res.ok) {
    const errorText = await res.text();
    logger.error('Profile API error:', errorText);
    throw new Error('FAILED');
  }

  const data: unknown = await res.json();
  const responseData = (Array.isArray(data) ? data[0] : data) as ProfileResponse | undefined;

  if (!responseData || typeof responseData !== 'object') {
    throw new Error('INVALID_RESPONSE');
  }

  if (responseData.success !== true) {
    throw new Error(responseData.message || '프로필 응답 실패');
  }

  if (!responseData.user || typeof responseData.user !== 'object') {
    throw new Error('사용자 정보가 없습니다.');
  }

  const user = normalizeUser(responseData.user, currentProvider, token);
  setStoredUser(user);
  return user;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const user = useUserSessionStore((state) => state.user);
  const loading = useUserSessionStore((state) => state.loading);
  const error = useUserSessionStore((state) => state.error);
  const setSession = useUserSessionStore((state) => state.setSession);
  const clearSession = useUserSessionStore((state) => state.clearSession);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setUserFromLogin = useCallback(
    (userData: LoginUserData, token: string) => {
      const currentProvider = getCurrentProvider();
      const nextUser = normalizeUser(userData, currentProvider, token);

      setSession({
        user: nextUser,
        loading: false,
        error: null,
      });
    },
    [setSession],
  );

  const load = useCallback(() => {
    const controller = new AbortController();
    setSession({ loading: true, error: null });

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const attempt = async (tries: number, delay = 1000) => {
      try {
        const nextUser = await fetchProfile(controller.signal);
        setSession({
          user: nextUser,
          loading: false,
          error: null,
        });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '프로필 로드 실패';

        if (e instanceof Error && e.name === 'AbortError') {
          return;
        }

        if (['RATE_LIMIT', 'FAILED', 'INVALID_RESPONSE'].includes(message) && tries > 0) {
          retryTimerRef.current = setTimeout(() => {
            void attempt(tries - 1, delay * 2);
          }, delay);
          return;
        }

        if (message === 'UNAUTHENTICATED' || message === LOGIN_REQUIRED_MESSAGE) {
          clearAuthSession();
          clearSession(LOGIN_REQUIRED_MESSAGE);
          return;
        }

        clearSession(message || '프로필 로드 실패');
      }
    };

    void attempt(3);
    return () => {
      controller.abort();
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [clearSession, setSession]);

  useEffect(() => {
    if (!hasAuthSession()) {
      clearSession(LOGIN_REQUIRED_MESSAGE);
      return;
    }

    if (user) {
      setSession({ loading: false });
      return;
    }

    return load();
  }, [clearSession, load, setSession, user]);

  const refresh = useCallback(() => {
    void load();
  }, [load]);

  const value: UserContextValue = useMemo(
    () => ({
      user,
      loading,
      error,
      refresh,
      setUserFromLogin,
    }),
    [error, loading, refresh, setUserFromLogin, user],
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
