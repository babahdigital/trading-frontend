/**
 * Idempotency-Key helpers per ADR-009 (Stripe-compatible pattern).
 *
 * Scope:
 *   - Generate conformant keys (8-128 chars, [A-Za-z0-9_-]).
 *   - Validate inbound keys from untrusted clients.
 *   - Forward to VPS1 when proxying POST requests.
 *
 * Note on storage: upstream backend (trading-forex) owns idempotency
 * state of record. This frontend only forwards the client key unchanged
 * so retries from the browser map 1:1 to single backend executions.
 */

import { randomUUID } from 'crypto';

/** Regex enforcing conformance with backend contract (ADR-009). */
export const IDEMPOTENCY_KEY_RE = /^[A-Za-z0-9_-]{8,128}$/;

/**
 * Generate a compliant idempotency key with optional namespace prefix.
 *
 * Example: generateIdempotencyKey('order') → "order_7fa3e8c1-b2d4-4f..."
 */
export function generateIdempotencyKey(namespace?: string): string {
  const uuid = randomUUID().replaceAll('-', '_');
  const prefix = namespace ? `${namespace.slice(0, 16)}_` : '';
  const key = `${prefix}${uuid}`;
  return key.slice(0, 128);
}

/**
 * Validate an inbound idempotency key. Returns `true` if compliant with
 * backend contract. Safe to call on untrusted input.
 */
export function isValidIdempotencyKey(key: string | null | undefined): key is string {
  if (!key) return false;
  return IDEMPOTENCY_KEY_RE.test(key);
}

/**
 * Extract Idempotency-Key header from a request, generating a fallback
 * if missing. Returns both the effective key and whether it was
 * client-supplied (useful for observability).
 */
export function resolveIdempotencyKey(
  headers: Headers,
  fallbackNamespace?: string,
): { key: string; clientSupplied: boolean } {
  const raw = headers.get('idempotency-key') ?? headers.get('Idempotency-Key');
  if (isValidIdempotencyKey(raw)) {
    return { key: raw, clientSupplied: true };
  }
  return { key: generateIdempotencyKey(fallbackNamespace), clientSupplied: false };
}

/**
 * Wrap a RequestInit to attach Idempotency-Key + preserve other headers.
 */
export function withIdempotencyKey(init: RequestInit, key: string): RequestInit {
  return {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers((init.headers ?? {}) as HeadersInit).entries()),
      'Idempotency-Key': key,
    },
  };
}
