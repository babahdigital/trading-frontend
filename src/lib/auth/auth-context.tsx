'use client';

import { createContext, useContext, useCallback, useMemo, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Subscription gate state.
 *   - 'loading': initial fetch in flight
 *   - 'active': user has valid subscription/license — premium APIs accessible
 *   - 'inactive': authenticated but no subscription — portal renders locked overlay
 *   - 'guest': not authenticated
 */
export type SubscriptionState = 'loading' | 'active' | 'inactive' | 'guest';

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
  /**
   * Subscription gate state (Pak Abdullah audit 2026-05-22 — institutional
   * locked page UX, prevent 403 console floods untuk un-subscribed users).
   * Components dapat skip /api/client/* fetch saat state='inactive'.
   */
  subscriptionState: SubscriptionState;
  /** Convenience boolean — `subscriptionState === 'active'`. */
  hasSubscription: boolean;
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
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState>('loading');

  // Single fetch /api/auth/me on mount → resolve subscription state.
  // Components downstream check `hasSubscription` SEBELUM fetch /api/client/*,
  // sehingga zero 403 console errors untuk un-subscribed users.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'same-origin', cache: 'no-store' });
        if (!res.ok) {
          if (!cancelled) setSubscriptionState('guest');
          return;
        }
        const data = await res.json();
        if (cancelled) return;
        if (!data?.user) {
          setSubscriptionState('guest');
          return;
        }
        // Admin role bypass — admin always considered "active" for portal access
        if (data.user.role === 'ADMIN') {
          setSubscriptionState('active');
          return;
        }
        const hasActive = !!(data.activeSubscription || data.licenseId || data.subscriptionId);
        setSubscriptionState(hasActive ? 'active' : 'inactive');
      } catch {
        if (!cancelled) setSubscriptionState('guest');
      }
    })();
    return () => { cancelled = true; };
  }, []);

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

  const hasSubscription = subscriptionState === 'active';

  const value = useMemo(
    () => ({ getAuthHeaders, getAuthToken, getAccessToken, logout, subscriptionState, hasSubscription }),
    [getAuthHeaders, getAuthToken, getAccessToken, logout, subscriptionState, hasSubscription],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
