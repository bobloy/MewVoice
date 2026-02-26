import { createContext } from 'react';
import { SteamUser } from '@/types/voicepack';

export interface AuthContextType {
  user: SteamUser | null;
  loading: boolean;
  login: () => void;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: async () => {},
});
