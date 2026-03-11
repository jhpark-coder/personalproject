import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { API_ENDPOINTS } from '../../shared/config/api';
import { getAuthToken, getCurrentProvider } from '../../shared/lib/storage';
import {
  UserContext,
  type LoginUserData,
  type UserContextValue,
  type UserData,
} from './userContext.shared';

interface ProfilePayload extends Partial<UserData> {
  id?: number;
}

interface ProfileResponse {
  success?: boolean;
  message?: string;
  user?: ProfilePayload;
}

function decodeJwtRole(token: string | null): string | undefined {
  try {
    if (!token) return undefined;
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.role === 'string' ? payload.role : undefined;
  } catch (e) {
    console.warn('JWT decode failed', e);
    return undefined;
  }
}

const normalizeUser = (source: ProfilePayload, fallbackProvider: string | null, token: string): UserData => ({
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
  role: source.role ?? decodeJwtRole(token),
});

const fetchProfile = async (signal: AbortSignal): Promise<UserData> => {
  const token = getAuthToken();
  const currentProvider = getCurrentProvider();
  
  console.log('🔍 fetchProfile 시작:', { hasToken: !!token, currentProvider });
  
  if (!token) throw new Error('로그인이 필요합니다.');

  console.log('📡 Profile API 호출:', API_ENDPOINTS.PROFILE);
  
  try {
    const res = await fetch(API_ENDPOINTS.PROFILE, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      signal,
    });

    console.log('📡 Profile API 응답:', res.status, res.statusText);

    if (res.status === 429) {
      console.log('⚠️ Rate limit 발생');
      throw new Error('RATE_LIMIT');
    }

    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Profile API 오류:', errorText);
      console.error('❌ Profile API 상태:', res.status, res.statusText);
      throw new Error('FAILED');
    }

    const data: unknown = await res.json();
    console.log('📄 Profile API 데이터:', data);
    
    // 응답이 배열인 경우 첫 번째 요소 사용
    const responseData = (Array.isArray(data) ? data[0] : data) as ProfileResponse | undefined;
    console.log('📄 Profile API 처리된 데이터:', responseData);
    
    // 응답 형식 검증 개선
    if (!responseData || typeof responseData !== 'object') {
      console.error('❌ Profile API 응답이 객체가 아님:', responseData);
      throw new Error('INVALID_RESPONSE');
    }
    
    if (responseData.success !== true) {
      console.error('❌ Profile API success가 true가 아님:', responseData.success);
      throw new Error(responseData.message || 'API 응답 실패');
    }
    
    if (!responseData.user || typeof responseData.user !== 'object') {
      console.error('❌ Profile API user 객체가 없음:', responseData.user);
      throw new Error('사용자 정보가 없습니다');
    }

    const user = normalizeUser(responseData.user, currentProvider, token);
    
    console.log('✅ UserContext 사용자 정보:', user);
    return user;
  } catch (error) {
    console.error('❌ fetchProfile 예외:', error);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청이 취소되었습니다');
    }
    throw error;
  }
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setUserFromLogin = useCallback((userData: LoginUserData, token: string) => {
    console.log('🔄 UserContext setUserFromLogin 호출:', userData);
    const currentProvider = getCurrentProvider();
    const nextUser = normalizeUser(userData, currentProvider, token);
    
    console.log('✅ UserContext 로그인 후 사용자 설정:', nextUser);
    setUser(nextUser);
    setLoading(false);
    setError(null);
  }, []);

  const load = useCallback(() => {
    console.log('🔄 UserContext load 함수 시작');
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    const attempt = async (tries: number, delay = 1000) => {
      console.log(`🔄 UserContext attempt ${4 - tries}/3`);
      try {
        const u = await fetchProfile(controller.signal);
        console.log('✅ UserContext 사용자 설정 성공:', u);
        setUser(u);
        setLoading(false);
        setError(null);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : '프로필 로드 실패';
        console.error('❌ UserContext attempt 실패:', message);
        
        // AbortError는 정상적인 취소이므로 에러로 처리하지 않음
        if (e instanceof Error && (e.name === 'AbortError' || e.message === '요청이 취소되었습니다')) {
          console.log('🔄 요청이 정상적으로 취소됨');
          return;
        }
        
        if (message === 'RATE_LIMIT' && tries > 0) {
          console.log(`⏳ Rate limit, ${delay}ms 후 재시도`);
          retryTimerRef.current = setTimeout(() => {
            void attempt(tries - 1, delay * 2);
          }, delay);
        } else if (message === 'FAILED' && tries > 0) {
          console.log(`⏳ API 실패, ${delay}ms 후 재시도`);
          retryTimerRef.current = setTimeout(() => {
            void attempt(tries - 1, delay * 2);
          }, delay);
        } else if (message === 'INVALID_RESPONSE' && tries > 0) {
          console.log(`⏳ 응답 형식 오류, ${delay}ms 후 재시도`);
          retryTimerRef.current = setTimeout(() => {
            void attempt(tries - 1, delay * 2);
          }, delay);
        } else {
          console.error('❌ UserContext 최종 실패:', message);
          setError(message || '프로필 로드 실패');
          setLoading(false);
          // 사용자 정보는 null로 유지 (로그아웃 상태)
        }
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
  }, []);

  useEffect(() => {
    console.log('🔄 UserContext useEffect 실행');
    console.log('🔄 UserContext 초기 상태:', { userId: user?.id });
    
    // 토큰이 없으면 로드하지 않음
    const token = getAuthToken();
    if (!token) {
      console.log('❌ 토큰이 없음, 로드 스킵');
      setLoading(false);
      setError('로그인이 필요합니다');
      return;
    }
    
    // 이미 사용자 정보가 있으면 다시 로드하지 않음
    if (user) {
      console.log('✅ 이미 사용자 정보가 있음, 로드 스킵');
      setLoading(false);
      return;
    }
    
    return load();
  }, [load, user]);

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

  console.log('🔄 UserContext value 업데이트:', { 
    user: user?.id, 
    loading, 
    error,
    hasUser: !!user,
    hasError: !!error 
  });

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}; 
