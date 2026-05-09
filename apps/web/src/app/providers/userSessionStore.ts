import { create } from 'zustand';
import type { UserData } from './userContext.shared';

interface UserSessionState {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  setUser: (user: UserData | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSession: (session: Partial<Pick<UserSessionState, 'user' | 'loading' | 'error'>>) => void;
  clearSession: (error?: string | null) => void;
}

export const useUserSessionStore = create<UserSessionState>((set) => ({
  user: null,
  loading: true,
  error: null,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setSession: (session) => set(session),
  clearSession: (error = null) => set({ user: null, loading: false, error }),
}));
