import type { ReactNode } from 'react';
import { UserProvider } from './UserContext';

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  return <UserProvider>{children}</UserProvider>;
}
