/**
 * Client-side fetch wrapper. Enriches outbound requests with the headers
 * documented in FRONTEND_DEVELOPMENT_GUIDE:
 *
 *   - Accept-Timezone (§4.5) — user IANA timezone
 *   - Idempotency-Key  (§4.3)  — replay-safe POST semantics
 *
 * Also observes X-RateLimit-* response headers so `<RateLimitStatus />`
 * components stay in sync.
 *
 * Usage:
 *   const res = await apiFetch('/api/client/status', { scope: 'signals' });
 *   const data = await res.json();
 *
 *   await apiFetch('/api/billing/checkout', {
 *     method: 'POST',
 *     idempotent: true,
 *     body: JSON.stringify({ tier: 'SIGNAL_VIP' }),
 *   });
 */

import { observeRateLimit } from './rate-limit-bus';
import { resolveTimezone } from '@/lib/timezone/util';
import { generateIdempotencyKey, isValidIdempotencyKey } from './idempotency';

export interface ApiFetchInit extends RequestInit {
  /** Rate limit scope label (optional) */
  scope?: string;
  /** Override effective timezone; default = resolveTimezone() */
  timezone?: string | null;
  /** If true, attach an Idempotency-Key header (auto-generated if not provided) */
  idempotent?: boolean;
  /** Explicit idempotency key — overrides auto-generation when `idempotent` is true */
  idempotencyKey?: string;
  /** Namespace prefix when auto-generating key, e.g. "checkout", "order" */
  idempotencyNamespace?: string;
}

function buildHeaders(init: ApiFetchInit): HeadersInit {
  const headers = new Headers((init.headers ?? {}) as HeadersInit);

  if (init.timezone !== null) {
    const tz = init.timezone ?? resolveTimezone();
    if (tz) headers.set('Accept-Timezone', tz);
  }

  if (init.idempotent) {
    const explicit = init.idempotencyKey;
    const key = isValidIdempotencyKey(explicit)
      ? (explicit as string)
      : generateIdempotencyKey(init.idempotencyNamespace);
    headers.set('Idempotency-Key', key);
  }

  return headers;
}

export async function apiFetch(
  input: RequestInfo | URL,
  init: ApiFetchInit = {},
): Promise<Response> {
  const { scope, timezone, idempotent, idempotencyKey, idempotencyNamespace, headers, ...rest } = init;
  void headers; // consumed via buildHeaders above
  const mergedHeaders = buildHeaders({ ...init, headers: init.headers });
  const response = await fetch(input, { ...rest, headers: mergedHeaders });
  observeRateLimit(response, scope);
  return response;
}
