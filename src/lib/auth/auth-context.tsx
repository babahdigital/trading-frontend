'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  getAuthHeaders: () => HeadersInit;
  getAuthToken: () => HeadersInit;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function safeLocalGet(key: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

function safeLocalRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch { /* storage disabled (private mode) — non-fatal */ }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const getAuthHeaders = useCallback((): HeadersInit => {
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${safeLocalGet('access_token')}`,
    };
  }, []);

  const getAuthToken = useCallback((): HeadersInit => {
    return {
      Authorization: `Bearer ${safeLocalGet('access_token')}`,
    };
  }, []);

  const logout = useCallback(() => {
    safeLocalRemove('access_token');
    safeLocalRemove('refresh_token');
    safeLocalRemove('user');
    if (typeof document !== 'undefined') {
      document.cookie = 'access_token=; path=/; max-age=0';
    }
    router.push('/login');
  }, [router]);

  const value = useMemo(() => ({ getAuthHeaders, getAuthToken, logout }), [getAuthHeaders, getAuthToken, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
