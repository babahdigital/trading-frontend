/**
 * Client-side fetch wrapper that auto-observes rate limit headers.
 *
 * Use this instead of bare `fetch()` in client components when you want
 * the `<RateLimitStatus />` indicator to update. Scope is optional — pass
 * it when you want per-endpoint filtering (e.g. "signals" vs "research").
 *
 * Usage:
 *   const res = await apiFetch('/api/client/status', { scope: 'signals' });
 *   const data = await res.json();
 *
 * Error handling mirrors native fetch — caller handles non-2xx.
 */

import { observeRateLimit } from './rate-limit-bus';

export interface ApiFetchInit extends RequestInit {
  /** Rate limit scope label (optional) */
  scope?: string;
}

export async function apiFetch(input: RequestInfo | URL, init: ApiFetchInit = {}): Promise<Response> {
  const { scope, ...rest } = init;
  const response = await fetch(input, rest);
  observeRateLimit(response, scope);
  return response;
}
