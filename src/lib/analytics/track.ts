/**
 * Client-side analytics tracker.
 *
 * 2026-05-20 — Phase A polish. Lightweight wrapper POST ke
 * /api/analytics/track. Session ID di-cache di sessionStorage (no PII).
 * UTM params auto-extract dari URL referer + window.location.
 *
 * Usage:
 *   import { track } from '@/lib/analytics/track';
 *   track('cta_click', { metadata: { cta: 'register-signal', tier: 'pro' } });
 *
 * Hook variant untuk pageview auto: `usePageviewTracking()` di layout
 * shell — call sekali di top of tree.
 */

type EventType =
  | 'pageview'
  | 'cta_click'
  | 'register_start'
  | 'register_step'
  | 'register_complete'
  | 'checkout_start'
  | 'checkout_success'
  | 'engagement';

const SESSION_KEY = 'babahalgo_session_id';

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      // UUID v4 light implementation
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : (
              Math.random().toString(36).slice(2) +
              Math.random().toString(36).slice(2)
            ).slice(0, 36);
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function extractUtm(): {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
} {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get('utm_source') ?? undefined,
    utmMedium: params.get('utm_medium') ?? undefined,
    utmCampaign: params.get('utm_campaign') ?? undefined,
  };
}

interface TrackPayload {
  path?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export function track(eventType: EventType, payload: TrackPayload = {}): void {
  if (typeof window === 'undefined') return;
  const body = {
    eventType,
    path: payload.path ?? window.location.pathname,
    referrer: document.referrer || undefined,
    sessionId: getOrCreateSessionId(),
    ...extractUtm(),
    metadata: payload.metadata,
  };

  // navigator.sendBeacon — fire-and-forget yang reliable bahkan
  // saat user navigate away (browser flush pending request).
  // Fallback ke fetch keepalive kalau Beacon tidak available.
  try {
    const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/track', blob);
    } else {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: blob,
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Silent fail — analytics never breaks UX
  }
}
