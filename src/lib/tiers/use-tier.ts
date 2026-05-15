'use client';

import { useEffect, useState } from 'react';
import { normalizeBackendTier, type TierName } from './tier-config';

/**
 * useTier — client hook to resolve current user's tier dari /api/auth/me.
 *
 * Return shape:
 *   - status: 'loading' | 'authenticated' | 'guest'
 *   - tier: TierName | null (null saat loading / guest)
 *   - userId: optional, untuk debugging context
 *
 * Backed by /api/auth/me yang sudah dipakai banyak hook lain — cache disetel
 * by browser response cache. Untuk gating yang authoritative, backend tetap
 * harus enforce; hook ini cuma UI-side hide/show.
 */
interface MePayload {
  user?: {
    id?: string;
    email?: string;
    role?: string;
    tier?: string;
    subscription?: { tier?: string; status?: string };
  };
  tier?: string;
}

export interface UseTierResult {
  status: 'loading' | 'authenticated' | 'guest';
  tier: TierName;
  isGuest: boolean;
}

export function useTier(): UseTierResult {
  const [status, setStatus] = useState<UseTierResult['status']>('loading');
  const [tier, setTier] = useState<TierName>('free');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/auth/me', { credentials: 'same-origin' })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: MePayload | null) => {
        if (cancelled) return;
        if (!body) {
          setStatus('guest');
          setTier('free');
          return;
        }
        const rawTier = body.user?.subscription?.tier ?? body.user?.tier ?? body.tier ?? null;
        setTier(normalizeBackendTier(rawTier));
        setStatus(body.user ? 'authenticated' : 'guest');
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('guest');
          setTier('free');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    status,
    tier,
    isGuest: status === 'guest',
  };
}
