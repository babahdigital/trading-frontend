/**
 * useUnreadNotifications — polling hook untuk count notifikasi unread.
 *
 * Source: /api/client/notifications/recent (limit=50). Filter items dengan
 * `read_at` null = unread. Poll setiap 60s; pause saat tab hidden untuk
 * hemat battery + backend load.
 *
 * Returns:
 *   { count, loading, error }
 *
 * Usage:
 *   const { count } = useUnreadNotifications();
 *   {count > 0 && <BadgeCount n={count} />}
 *
 * Backend response shape (lihat /api/client/notifications/recent/route.ts):
 *   { source, items: BackendNotification[], count, next_cursor }
 * BackendNotification tidak punya `read_at` field standard, jadi sementara
 * count semua items recent (last 50) yang occurred dalam 7 hari terakhir.
 * Phase 2: backend add /read endpoint + read_at column → benar-benar unread.
 */
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/lib/auth/auth-context';

const POLL_INTERVAL_MS = 60_000;
const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 hari

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
        const data = (await res.json()) as { items?: Array<{ occurred_at?: string; read_at?: string | null }> };
        const items = data.items ?? [];
        const now = Date.now();
        // Filter recent (7d) yang belum dibaca. Backend belum tracking read_at,
        // jadi semua items dalam 7d = "unread" sementara. Saat backend siap,
        // tambah filter `r.read_at == null`.
        const unread = items.filter((i) => {
          if (!i.occurred_at) return false;
          const age = now - new Date(i.occurred_at).getTime();
          if (age > RECENT_WINDOW_MS) return false;
          if (i.read_at) return false;
          return true;
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
