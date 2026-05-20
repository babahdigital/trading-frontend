/**
 * useNotificationLog — polling hook untuk backend crypto notification_event_log.
 *
 * Backend rc25+ source: /api/tenants/{id}/notifications/log dengan since_id
 * cursor. FE poll setiap 5s (atau jika has_more=true, langsung re-poll
 * tanpa delay untuk drain backlog).
 *
 * Cursor persisted di localStorage `babah.notif.last_id.v1` — cross-tab
 * shared, survive refresh. Reset cursor bila user logout (cleanup) via
 * resetNotificationCursor() helper.
 *
 * Event types yang FE handle (sample):
 *   - position.opened (info) — entry trade
 *   - position.reconcile_close (warning) — exit trade
 *   - position.reconcile_tighten (info) — SL ratchet
 *   - kill_switch.activated (critical) — emergency stop
 *   - risk.daily_loss_cap (critical) — daily cap hit
 *   - tenant.auto_paused (critical) — balance guard trip
 *   - tenant.resumed (info) — admin resume
 *   - signal.advisor_rejected (info) — AI veto signal
 *
 * Severity drives FE UI:
 *   - info → Telegram only (backend), no FE toast
 *   - warning → Telegram + WA + yellow toast
 *   - critical → Telegram + WA + Email + red toast modal
 *
 * Phase 1 (sesi ini): hook returns events; FE caller decide rendering.
 * Phase 2: dispatcher component yang auto-render toast + trigger channel
 *          adapter (Fonnte WhatsApp, Brevo Email) berdasarkan user prefs.
 */
'use client';

import { useEffect, useState, useRef, useCallback } from 'react';

const CURSOR_STORAGE_KEY = 'babah.notif.last_id.v1';
const POLL_INTERVAL_MS = 5_000;
const FAST_POLL_INTERVAL_MS = 100; // saat has_more=true, drain cepat

export type NotificationSeverity = 'info' | 'warning' | 'critical';

export interface NotificationLogItem {
  id: number;
  event_type: string;
  severity: NotificationSeverity;
  message: string;
  payload?: Record<string, unknown>;
  subject?: string;
  created_at: string;
}

interface UseNotificationLogResult {
  events: NotificationLogItem[];
  loading: boolean;
  error: string | null;
  lastId: number;
  reset: () => void;
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
    // localStorage disabled — non-fatal
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
        setEvents((prev) => [...data.items, ...prev].slice(0, 200)); // cap buffer 200
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

  useEffect(() => {
    isMounted.current = true;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const loop = async () => {
      while (isMounted.current && !ctrl.signal.aborted) {
        // Skip kalau tab hidden — hemat backend load + battery
        if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
          await new Promise((r) => { timer = setTimeout(r, POLL_INTERVAL_MS); });
          continue;
        }
        const { hasMore } = await pollOnce(ctrl.signal);
        if (ctrl.signal.aborted) break;
        // Drain mode: backlog ada → poll cepat. Normal: 5s interval.
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

  return { events, loading, error, lastId, reset };
}
