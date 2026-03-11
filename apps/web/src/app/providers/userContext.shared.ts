import { createContext, useContext } from 'react';

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
}

export interface LoginUserData extends Partial<UserData> {
  id?: number;
}

export interface UserContextValue {
  user: UserData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  setUserFromLogin: (userData: LoginUserData, token: string) => void;
}

export const UserContext = createContext<UserContextValue | undefined>(undefined);

export const useUser = (): UserContextValue => {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error('useUser must be used within UserProvider');
  }
  return ctx;
};
