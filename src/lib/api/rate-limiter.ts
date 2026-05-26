/**
 * Server-side rate limiter — SINGLE SOURCE OF TRUTH for all API rate limits.
 *
 * In-memory sliding window counter (per IP or per user). Suitable for
 * single-instance deployments. For multi-instance, swap the store for Redis.
 *
 * Usage:
 *   import { checkRateLimit, RATE_LIMITS } from '@/lib/api/rate-limiter';
 *
 *   const result = checkRateLimit(clientIp, RATE_LIMITS.AUTH_LOGIN);
 *   if (!result.allowed) {
 *     return NextResponse.json(
 *       { code: 'rate_limited', retryAfterMs: result.retryAfterMs },
 *       { status: 429, headers: result.headers }
 *     );
 *   }
 */

import { NextResponse } from 'next/server';

// ─── Rate Limit Config Registry ───

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  scope: string;
}

export const RATE_LIMITS = {
  AUTH_LOGIN: { windowMs: 60_000, maxRequests: 10, scope: 'auth:login' },
  AUTH_REGISTER: { windowMs: 60_000, maxRequests: 5, scope: 'auth:register' },
  AUTH_FORGOT_PASSWORD: { windowMs: 3_600_000, maxRequests: 3, scope: 'auth:forgot' },
  AUTH_RESEND_VERIFICATION: { windowMs: 3_600_000, maxRequests: 3, scope: 'auth:resend' },
  AUTH_RESET_PASSWORD: { windowMs: 3_600_000, maxRequests: 5, scope: 'auth:reset' },
  BILLING_CHECKOUT: { windowMs: 60_000, maxRequests: 5, scope: 'billing:checkout' },
  BILLING_CHARGE: { windowMs: 60_000, maxRequests: 3, scope: 'billing:charge' },
  CHAT_MESSAGE: { windowMs: 60_000, maxRequests: 20, scope: 'chat:message' },
  CHAT_LEAD: { windowMs: 60_000, maxRequests: 6, scope: 'chat:lead' },
  WHATSAPP_SEND_OTP: { windowMs: 60_000, maxRequests: 3, scope: 'wa:otp' },
  WHATSAPP_VERIFY: { windowMs: 60_000, maxRequests: 5, scope: 'wa:verify' },
  CONTACT_FORM: { windowMs: 60_000, maxRequests: 3, scope: 'contact:form' },
  NEWSLETTER_SUBSCRIBE: { windowMs: 60_000, maxRequests: 3, scope: 'newsletter:sub' },
  PUBLIC_API: { windowMs: 60_000, maxRequests: 60, scope: 'public:api' },
} as const;

// ─── In-Memory Store ───

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

// ─── Core Check ───

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAtMs: number;
  retryAfterMs: number;
  headers: Record<string, string>;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): RateLimitResult {
  cleanup();

  const key = `${config.scope}:${identifier}`;
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + config.windowMs };
    store.set(key, entry);
  }

  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);
  const retryAfterMs = allowed ? 0 : entry.resetAt - now;

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(config.maxRequests),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.ceil(entry.resetAt / 1000)),
  };
  if (!allowed) {
    headers['Retry-After'] = String(Math.ceil(retryAfterMs / 1000));
  }

  return { allowed, remaining, limit: config.maxRequests, resetAtMs: entry.resetAt, retryAfterMs, headers };
}

// ─── Convenience: create 429 response ───

export function rateLimitedResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { code: 'rate_limited', retryAfterMs: result.retryAfterMs },
    { status: 429, headers: result.headers },
  );
}
