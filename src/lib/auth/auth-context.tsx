'use client';

import { createContext, useContext, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  /**
   * Headers for authenticated fetch calls. With HttpOnly cookie auth the
   * browser attaches the token automatically on same-origin requests, so
   * this method returns only the Content-Type. Kept as a method for
   * compatibility with all existing call sites.
   */
  getAuthHeaders: () => HeadersInit;
  /** Deprecated alias retained for backward compatibility. Returns empty headers. */
  getAuthToken: () => HeadersInit;
  /**
   * Raw access token. With HttpOnly cookies the token is no longer reachable
   * from JS — returns empty string. Components that need a token for WebSocket
   * first-message handshake should fetch one from `/api/auth/ws-token` (planned).
   */
  getAccessToken: () => string;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function safeSessionRemove(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // storage disabled (private mode) — non-fatal
  }
}

function purgeLegacyAuthArtifacts(): void {
  if (typeof window === 'undefined') return;
  try {
    // Migration cleanup: prior version persisted tokens to localStorage.
    // Remove them so we don't leak a stale token into the page in case a
    // returning user logs in via the new cookie flow.
    window.localStorage.removeItem('access_token');
    window.localStorage.removeItem('refresh_token');
    window.localStorage.removeItem('user');
  } catch {
    // ignore
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const getAuthHeaders = useCallback((): HeadersInit => {
    // Browser sends HttpOnly cookies automatically. Only the Content-Type
    // is needed here.
    return { 'Content-Type': 'application/json' };
  }, []);

  const getAuthToken = useCallback((): HeadersInit => {
    return {};
  }, []);

  const getAccessToken = useCallback((): string => {
    return '';
  }, []);

  const logout = useCallback(async () => {
    purgeLegacyAuthArtifacts();
    safeSessionRemove('user');
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
      });
    } catch {
      // Even if the call fails, navigate away — cookies will expire and
      // middleware will redirect on next protected request.
    }
    router.push('/login');
  }, [router]);

  const value = useMemo(
    () => ({ getAuthHeaders, getAuthToken, getAccessToken, logout }),
    [getAuthHeaders, getAuthToken, getAccessToken, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
