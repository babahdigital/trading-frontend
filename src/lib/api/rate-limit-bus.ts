/**
 * Rate limit event bus.
 *
 * API client wrappers (`fetchWithRateLimit`) emit `update` events after
 * every response by parsing `X-RateLimit-*` headers. UI components
 * subscribe and render current quota / reset countdown.
 *
 * Single singleton instance — safe under Next.js module caching.
 */

export interface RateLimitInfo {
  /** Requests remaining in current window */
  remaining: number;
  /** Total quota for current window */
  limit: number;
  /** Unix ms when window resets */
  resetAtMs: number;
  /** Which endpoint group emitted this (optional, for per-scope display) */
  scope?: string;
  /** Timestamp of the response */
  observedAtMs: number;
}

type Listener = (info: RateLimitInfo) => void;

class RateLimitBus {
  private listeners = new Set<Listener>();
  private last: RateLimitInfo | null = null;

  on(listener: Listener): () => void {
    this.listeners.add(listener);
    if (this.last) listener(this.last);
    return () => this.listeners.delete(listener);
  }

  emit(info: RateLimitInfo): void {
    this.last = info;
    for (const fn of this.listeners) {
      try {
        fn(info);
      } catch {
        // swallow — listeners must not break the bus
      }
    }
  }

  snapshot(): RateLimitInfo | null {
    return this.last;
  }

  reset(): void {
    this.last = null;
  }
}

export const rateLimitBus = new RateLimitBus();

/**
 * Parse X-RateLimit-* headers from a Response and emit to the bus. Safe
 * to call on every fetch — no-op if headers missing.
 */
export function observeRateLimit(response: Response, scope?: string): void {
  const remainingRaw = response.headers.get('X-RateLimit-Remaining');
  const limitRaw = response.headers.get('X-RateLimit-Limit');
  const resetRaw = response.headers.get('X-RateLimit-Reset');

  if (remainingRaw == null || limitRaw == null || resetRaw == null) return;

  const remaining = parseInt(remainingRaw, 10);
  const limit = parseInt(limitRaw, 10);
  const resetSec = parseInt(resetRaw, 10);
  if (Number.isNaN(remaining) || Number.isNaN(limit) || Number.isNaN(resetSec)) return;

  // Backend sends Unix seconds per VPS1 contract. Convert to ms.
  const resetAtMs = resetSec < 1e12 ? resetSec * 1000 : resetSec;

  rateLimitBus.emit({
    remaining,
    limit,
    resetAtMs,
    scope,
    observedAtMs: Date.now(),
  });
}
