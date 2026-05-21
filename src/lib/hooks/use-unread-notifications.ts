/**
 * useUnreadNotifications — polling hook untuk count notifikasi unread.
 *
 * Source dual-path:
 *   1. Crypto rc26: /api/crypto/notifications/log returns items dengan
 *      proper `read_at` field. Filter `read_at == null` = real unread.
 *   2. Forex outbound_log: /api/client/notifications/recent — backend
 *      forex sudah punya read_at field per audit 2026-05-21.
 *
 * Phase 1 (sesi ini): pakai /api/client/notifications/recent yang merge
 * forex sources. Bila backend forex outbound_log juga return read_at,
 * filter benar-benar unread.
 *
 * Returns:
 *   { count, loading, error }
 *
 * Usage:
 *   const { count } = useUnreadNotifications();
 *   {count > 0 && <BadgeCount n={count} />}
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

const POLL_INTERVAL_MS = 60_000;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari (fallback bila read_at tidak ada)

interface UseUnreadNotificationsResult {
  count: number;
  loading: boolean;
  error: string | null;
}

export function useUnreadNotifications(): UseUnreadNotificationsResult {
  const { getAuthHeaders } = useAuth();
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    let abort = new AbortController();
    let timer: ReturnType<typeof setInterval> | null = null;

    async function fetchCount() {
      try {
        abort.abort();
        abort = new AbortController();
        const res = await fetch('/api/client/notifications/recent?limit=50', {
          headers: getAuthHeaders(),
          signal: abort.signal,
        });
        if (!res.ok) {
          if (res.status === 401) {
            // Not authenticated — silently set count 0
            if (isMounted.current) {
              setCount(0);
              setError(null);
            }
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as { items?: Array<{ occurred_at?: string; created_at?: string; read_at?: string | null }> };
        const items = data.items ?? [];
        const now = Date.now();
        // Filter unread: prefer real `read_at` field (backend rc26+ + forex).
        // Fallback ke recent-7d window kalau read_at tidak ada (legacy items).
        const unread = items.filter((i) => {
          if (i.read_at) return false; // sudah dibaca explicit
          const ts = i.occurred_at ?? i.created_at;
          if (!ts) return true; // tanpa timestamp = anggap unread
          const age = now - new Date(ts).getTime();
          return age <= RECENT_WINDOW_MS;
        });
        if (isMounted.current) {
          setCount(unread.length);
          setError(null);
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (isMounted.current) {
          setError(err instanceof Error ? err.message : 'unknown');
        }
      } finally {
        if (isMounted.current) setLoading(false);
      }
    }

    function startPolling() {
      void fetchCount();
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
        void fetchCount();
      }, POLL_INTERVAL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void fetchCount();
      }
    }

    startPolling();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange);
    }

    return () => {
      isMounted.current = false;
      abort.abort();
      if (timer) clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { count, loading, error };
}
