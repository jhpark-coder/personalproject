import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { API_ENDPOINTS } from '../config/api';

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
}

interface UserContextValue {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const UserContext = createContext<UserContextValue | undefined>(undefined);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
};

const fetchProfile = async (signal: AbortSignal): Promise<UserData> => {
  const token = localStorage.getItem('token');
  const currentProvider = localStorage.getItem('currentProvider');
  if (!token) throw new Error('로그인이 필요합니다.');

  const res = await fetch(API_ENDPOINTS.PROFILE, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
    signal,
  });

  if (res.status === 429) {
    throw new Error('RATE_LIMIT');
  }

  if (!res.ok) throw new Error('FAILED');

  const data = await res.json();
  if (!data.success || !data.user) throw new Error(data.message || 'FAILED');
  const u = data.user;
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
  };
  return user;
};

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    const attempt = async (tries: number, delay = 500) => {
      try {
        const u = await fetchProfile(controller.signal);
        setUser(u);
        setLoading(false);
      } catch (e: any) {
        if (e.message === 'RATE_LIMIT' && tries > 0) {
          setTimeout(() => attempt(tries - 1, delay * 2), delay);
        } else if (e.name !== 'AbortError') {
          setError(e.message || '프로필 로드 실패');
          setLoading(false);
        }
      }
    };

    attempt(3);
    return () => controller.abort();
  };

  useEffect(() => {
    const abort = load();
    return abort;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value: UserContextValue = {
    user,
    loading,
    error,
    refresh: () => load(),
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}; 