import { useState, useEffect, useCallback, ReactNode } from 'react';
import { getCurrentUser, logout as apiLogout, getSteamLoginUrl } from '@/lib/api';
import { AuthContext } from './auth-context';
import type { SteamUser } from '@/types/voicepack';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SteamUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(() => {
    window.location.href = getSteamLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
