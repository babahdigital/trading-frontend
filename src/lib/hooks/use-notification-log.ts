/**
 * useNotificationLog — polling hook untuk backend crypto notification_event_log
 * (rc26+).
 *
 * Backend rc26 fields per item:
 *   - id (bigint cursor)
 *   - event_type (string)
 *   - severity ('info'|'warning'|'critical')
 *   - message (pre-rendered locale-aware)
 *   - subject (optional, email title)
 *   - payload (raw data — symbol/side/price etc.)
 *   - channel_hint (CSV: "telegram,whatsapp,email" / "in_app")
 *   - locale ('id'|'en') — auto-fetched dari tenant.notification_lang
 *   - idempotency_key (string)
 *   - read_at (ISO timestamp atau null = unread)
 *   - created_at (ISO timestamp)
 *
 * Polling 5s. Drain mode 100ms saat has_more=true. Pause saat tab hidden.
 * Cursor persisted di localStorage `babah.notif.last_id.v1`.
 *
 * Mark-as-read via POST /api/crypto/notifications/log/{id}/read (idempotent,
 * backend preserve first read_at).
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const CURSOR_STORAGE_KEY = 'babah.notif.last_id.v1';
const POLL_INTERVAL_MS = 5_000;
const FAST_POLL_INTERVAL_MS = 100;

export type NotificationSeverity = 'info' | 'warning' | 'critical';
export type NotificationChannel = 'in_app' | 'telegram' | 'whatsapp' | 'email';

export interface NotificationLogItem {
  id: number;
  event_type: string;
  severity: NotificationSeverity;
  message: string;
  subject?: string;
  payload?: Record<string, unknown>;
  /** CSV: "telegram,whatsapp,email" atau "in_app". Default critical → all,
   *  warning → telegram,whatsapp,in_app, info → in_app. */
  channel_hint?: string;
  locale?: 'id' | 'en';
  idempotency_key?: string;
  read_at?: string | null;
  created_at: string;
}

interface UseNotificationLogResult {
  events: NotificationLogItem[];
  loading: boolean;
  error: string | null;
  lastId: number;
  reset: () => void;
  markAsRead: (id: number) => Promise<void>;
}

function loadCursor(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(CURSOR_STORAGE_KEY);
    return raw ? Number(raw) : 0;
  } catch {
    return 0;
  }
}

function saveCursor(id: number): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURSOR_STORAGE_KEY, String(id));
  } catch {
    /* localStorage disabled */
  }
}

export function resetNotificationCursor(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(CURSOR_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function parseChannelHint(hint: string | undefined, severity: NotificationSeverity): NotificationChannel[] {
  if (!hint) {
    // Fallback per severity bila backend tidak provide hint
    if (severity === 'critical') return ['telegram', 'whatsapp', 'email', 'in_app'];
    if (severity === 'warning') return ['telegram', 'whatsapp', 'in_app'];
    return ['in_app'];
  }
  return hint
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is NotificationChannel =>
      s === 'in_app' || s === 'telegram' || s === 'whatsapp' || s === 'email',
    );
}

export function useNotificationLog(): UseNotificationLogResult {
  const [events, setEvents] = useState<NotificationLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastId, setLastId] = useState<number>(() => loadCursor());
  const lastIdRef = useRef<number>(lastId);
  const isMounted = useRef(true);

  useEffect(() => { lastIdRef.current = lastId; }, [lastId]);

  const pollOnce = useCallback(async (signal?: AbortSignal): Promise<{ hasMore: boolean }> => {
    const sinceId = lastIdRef.current;
    try {
      const res = await fetch(`/api/crypto/notifications/log?since_id=${sinceId}&limit=100`, {
        credentials: 'same-origin',
        signal,
      });
      if (!res.ok) {
        if (res.status === 401) {
          if (isMounted.current) setEvents([]);
          return { hasMore: false };
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        items: NotificationLogItem[];
        next_since_id: number;
        has_more: boolean;
        source?: string;
      };
      if (!isMounted.current) return { hasMore: false };
      if (data.items.length > 0) {
        setEvents((prev) => [...data.items, ...prev].slice(0, 200));
        const newCursor = data.next_since_id ?? data.items[data.items.length - 1].id;
        setLastId(newCursor);
        lastIdRef.current = newCursor;
        saveCursor(newCursor);
      }
      setError(null);
      return { hasMore: Boolean(data.has_more) };
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return { hasMore: false };
      if (isMounted.current) {
        setError(err instanceof Error ? err.message : 'unknown');
      }
      return { hasMore: false };
    } finally {
      if (isMounted.current) setLoading(false);
    }
  }, []);

  const markAsRead = useCallback(async (id: number): Promise<void> => {
    // Optimistic update — set read_at locally immediately, backend fire-forget.
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, read_at: e.read_at ?? new Date().toISOString() } : e)),
    );
    try {
      await fetch(`/api/crypto/notifications/log/${id}/read`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      // Backend response idempotent — no need to update state again.
    } catch {
      // Network glitch — leave optimistic state. Next poll will reconcile.
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loop = async () => {
      while (isMounted.current && !ctrl.signal.aborted) {
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          await new Promise((r) => { timer = setTimeout(r, POLL_INTERVAL_MS); });
          continue;
        }
        const { hasMore } = await pollOnce(ctrl.signal);
        if (ctrl.signal.aborted) break;
        const wait = hasMore ? FAST_POLL_INTERVAL_MS : POLL_INTERVAL_MS;
        await new Promise((r) => { timer = setTimeout(r, wait); });
      }
    };

    void loop();

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void pollOnce(ctrl.signal);
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility);
    }

    return () => {
      isMounted.current = false;
      ctrl.abort();
      if (timer) clearTimeout(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reset = useCallback(() => {
    resetNotificationCursor();
    setLastId(0);
    lastIdRef.current = 0;
    setEvents([]);
  }, []);

  return { events, loading, error, lastId, reset, markAsRead };
}
