'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  getAuthHeaders: () => HeadersInit;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const getAuthHeaders = useCallback((): HeadersInit => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('access_token') ?? '' : ''}`,
    };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    document.cookie = 'access_token=; path=/; max-age=0';
    router.push('/login');
  }, [router]);

  const value = useMemo(() => ({ getAuthHeaders, logout }), [getAuthHeaders, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
