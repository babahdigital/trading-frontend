/**
 * NotificationDispatcher — mount-only component yang subscribe ke
 * useNotificationLog dan dispatch event ke channel sesuai backend hint
 * + user preference.
 *
 * Architecture (backend rc26+):
 *   - Backend = SoT log table. Telegram dispatch sync di backend.
 *   - FE = WhatsApp + Email + In-app toast dispatch.
 *
 * Channel resolution (priority):
 *   1. User explicit override per event_type (future: UI preference panel)
 *   2. Backend channel_hint CSV (rc26+ auto-compute per severity)
 *   3. Fallback per severity:
 *      critical → in_app + telegram + whatsapp + email
 *      warning  → in_app + telegram + whatsapp
 *      info     → in_app
 *
 * Phase 1 (sesi ini):
 *   ✅ In-app toast dispatch via useToast()
 *   ⏳ WhatsApp + Email defer (butuh existing Fonnte / Brevo adapter wiring)
 *
 * Idempotency: track last-dispatched ID di ref, jangan double-dispatch
 * untuk event yang same id muncul ulang (e.g. drain mode merge).
 *
 * Auto mark-as-read setelah dispatch berhasil (untuk in_app toast) supaya
 * badge counter di sidebar Bell update.
 */
'use client';

import { useEffect, useRef } from 'react';
import { useToast } from '@/components/ui/toast';
import { useNotificationLog, parseChannelHint, type NotificationLogItem } from '@/lib/hooks/use-notification-log';

interface DispatchedItem {
  id: number;
  dispatched_at: number;
}

const MAX_TRACKED = 500;

export function NotificationDispatcher() {
  const { events, markAsRead } = useNotificationLog();
  const toast = useToast();
  const dispatched = useRef<Map<number, DispatchedItem>>(new Map());

  useEffect(() => {
    for (const event of events) {
      if (dispatched.current.has(event.id)) continue;
      if (event.read_at) {
        // Sudah read di sesi lain (cross-tab atau previous mount) — skip dispatch.
        dispatched.current.set(event.id, { id: event.id, dispatched_at: Date.now() });
        continue;
      }
      void dispatchEvent(event);
      dispatched.current.set(event.id, { id: event.id, dispatched_at: Date.now() });
    }

    // Trim tracker supaya tidak grow unbounded
    if (dispatched.current.size > MAX_TRACKED) {
      const entries = Array.from(dispatched.current.entries())
        .sort((a, b) => b[1].dispatched_at - a[1].dispatched_at)
        .slice(0, MAX_TRACKED);
      dispatched.current = new Map(entries);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  async function dispatchEvent(event: NotificationLogItem) {
    const channels = parseChannelHint(event.channel_hint, event.severity);
    const shouldShowToast = channels.includes('in_app');

    if (shouldShowToast) {
      // Severity → toast tone mapping
      const tone =
        event.severity === 'critical' ? 'error' :
        event.severity === 'warning' ? 'warning' :
        'info';
      try {
        toast.push({
          tone,
          title: event.subject ?? event.message.split('\n')[0].slice(0, 80),
          description: event.subject ? event.message : undefined,
          durationMs: event.severity === 'critical' ? 0 : 6_000, // critical = sticky
        });
      } catch {
        // Toast provider not mounted yet — silent
      }
      // Auto mark-as-read setelah in-app surfaced (badge counter update)
      void markAsRead(event.id);
    }

    // WhatsApp + Email adapter integration — Phase 2:
    // - 'whatsapp' channel: call /api/client/notifications/dispatch dengan
    //   payload {channel:'whatsapp', message, phone:user.phone}. Backend
    //   forward ke Fonnte adapter.
    // - 'email' channel: call /api/client/notifications/dispatch dengan
    //   {channel:'email', subject, message, to:user.email}. Backend
    //   forward ke Brevo adapter.
    // Telegram di-handle backend langsung (rc25 TelegramSink) — FE skip.
  }

  // No-render component
  return null;
}
