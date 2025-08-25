import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { API_ENDPOINTS } from '@config/api';
import { apiClient, handleApiError } from '@utils/axiosConfig';

export interface UserData {
  id: number;
  email: string;
  name: string;
  provider?: string;
  picture?: string;
  height?: string;
  weight?: string;
  age?: string;
  gender?: string;
  phoneNumber?: string;
  birthDate?: string;
  role?: string;
  nickname?: string;
}

interface UserContextValue {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setUserFromLogin: (userData: UserData, token: string) => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

interface UserProviderProps {
  children: ReactNode;
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

const fetchProfile = async (signal: AbortSignal): Promise<UserData> => {
  const token = localStorage.getItem('token');
  const currentProvider = localStorage.getItem('currentProvider');
  
  console.log('🔍 fetchProfile 시작:', { hasToken: !!token, currentProvider });
  
  if (!token) throw new Error('로그인이 필요합니다.');

  console.log('📡 Profile API 호출:', API_ENDPOINTS.PROFILE);
  
  try {
    const response = await apiClient.get(API_ENDPOINTS.PROFILE, {
      signal,
    });

    console.log('📡 Profile API 응답:', response.status, response.statusText);
    console.log('📄 Profile API 데이터:', response.data);
    
    // 응답이 배열인 경우 첫 번째 요소 사용
    const responseData = Array.isArray(response.data) ? response.data[0] : response.data;
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
    
    const u = responseData.user;
    const roleFromToken = decodeJwtRole(token);
    const user: UserData = {
      id: u.id || 0,
      email: u.email || '',
      name: u.name || '',
      provider: u.provider || currentProvider || 'local',
      picture: u.picture || '',
      height: u.height || '',
      weight: u.weight || '',
      age: u.age || '',
      gender: u.gender || '',
      phoneNumber: u.phoneNumber || '',
      birthDate: u.birthDate || '',
      role: u.role || roleFromToken, // 서버가 제공하면 우선 사용, 없으면 JWT에서 추출
      nickname: u.nickname || '',
    };
    
    console.log('✅ UserContext 사용자 정보:', user);
    return user;
  } catch (error) {
    console.error('❌ fetchProfile 예외:', error);
    
    // axios의 AbortError 처리
    if (signal.aborted) {
      throw new Error('요청이 취소되었습니다');
    }
    
    // axios 에러 처리 유틸리티 사용
    const errorMessage = handleApiError(error);
    
    // 특정 에러 타입 유지 (재시도 로직용)
    if (errorMessage.includes('RATE_LIMIT')) {
      throw new Error('RATE_LIMIT');
    }
    if (errorMessage.includes('세션이 만료') || errorMessage.includes('unauthorized')) {
      throw new Error('FAILED');
    }
    
    throw new Error(errorMessage);
  }
};

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const setUserFromLogin = (userData: UserData, token: string) => {
    console.log('🔄 UserContext setUserFromLogin 호출:', userData);
    
    const roleFromToken = decodeJwtRole(token);
    const user: UserData = {
      id: userData.id || 0,
      email: userData.email || '',
      name: userData.name || '',
      provider: userData.provider || 'local',
      picture: userData.picture || '',
      height: userData.height || '',
      weight: userData.weight || '',
      age: userData.age || '',
      gender: userData.gender || '',
      phoneNumber: userData.phoneNumber || '',
      birthDate: userData.birthDate || '',
      role: userData.role || roleFromToken,
      nickname: userData.nickname || '',
    };
    
    console.log('✅ UserContext 로그인 후 사용자 설정:', user);
    setUser(user);
    setLoading(false);
    setError(null);
  };

  const load = () => {
    console.log('🔄 UserContext load 함수 시작');
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const attempt = async (tries: number, delay = 1000) => {
      console.log(`🔄 UserContext attempt ${4 - tries}/3`);
      try {
        const u = await fetchProfile(controller.signal);
        console.log('✅ UserContext 사용자 설정 성공:', u);
        setUser(u);
        setLoading(false);
        setError(null);
      } catch (e: any) {
        console.error('❌ UserContext attempt 실패:', e.message);
        
        // AbortError는 정상적인 취소이므로 에러로 처리하지 않음
        if (e.name === 'AbortError' || e.message === '요청이 취소되었습니다') {
          console.log('🔄 요청이 정상적으로 취소됨');
          return;
        }
        
        if (e.message === 'RATE_LIMIT' && tries > 0) {
          console.log(`⏳ Rate limit, ${delay}ms 후 재시도`);
          setTimeout(() => attempt(tries - 1, delay * 2), delay);
        } else if (e.message === 'FAILED' && tries > 0) {
          console.log(`⏳ API 실패, ${delay}ms 후 재시도`);
          setTimeout(() => attempt(tries - 1, delay * 2), delay);
        } else if (e.message === 'INVALID_RESPONSE' && tries > 0) {
          console.log(`⏳ 응답 형식 오류, ${delay}ms 후 재시도`);
          setTimeout(() => attempt(tries - 1, delay * 2), delay);
        } else {
          console.error('❌ UserContext 최종 실패:', e.message);
          setError(e.message || '프로필 로드 실패');
          setLoading(false);
          // 사용자 정보는 null로 유지 (로그아웃 상태)
        }
      }
    };

    attempt(3);
    return () => controller.abort();
  };

  useEffect(() => {
    console.log('🔄 UserContext useEffect 실행');
    console.log('🔄 UserContext 초기 상태:', { user, loading, error });
    
    // 토큰이 없으면 로드하지 않음
    const token = localStorage.getItem('token');
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
    
    const abort = load();
    return abort;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateUser = (userData: Partial<UserData>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.post<any>(API_ENDPOINTS.LOGIN, {
        email,
        password
      });

      if (response.data.success && response.data.data) {
        const { user: userData, token } = response.data.data;
        setUserFromLogin(userData, token);
        return true;
      } else {
        setError(response.data.message || '로그인에 실패했습니다.');
        return false;
      }
    } catch (e: unknown) {
      const errorMessage = handleApiError(e);
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await apiClient.get<any>(API_ENDPOINTS.PROFILE);
      if (response.data.success && response.data.data) {
        setUser(response.data.data);
      } else {
        localStorage.removeItem('token');
      }
    } catch (e: unknown) {
      console.error('인증 상태 확인 실패:', handleApiError(e));
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const value: UserContextValue = {
    user,
    loading,
    error,
    refresh: () => load(),
    setUserFromLogin,
  };

  console.log('🔄 UserContext value 업데이트:', { 
    user: user?.id, 
    loading, 
    error,
    hasUser: !!user,
    hasError: !!error 
  });

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}; 