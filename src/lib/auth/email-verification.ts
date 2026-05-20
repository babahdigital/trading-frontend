/**
 * Email verification token helpers.
 *
 * 2026-05-20 — Phase A polish. Generate raw token + store SHA-256
 * hash (never plaintext). Verify endpoint hash-compare in constant time.
 *
 * Token lifecycle:
 *   - Generated saat register success (best-effort, non-blocking)
 *   - Expires 24 jam default
 *   - Single use — usedAt set saat verify success
 *   - Multiple tokens per user OK (resend flow) — newest valid wins
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export const EMAIL_VERIFICATION_TTL_HOURS = 24;
const TOKEN_BYTES = 32;

export interface GeneratedToken {
  raw: string;
  hash: string;
  expiresAt: Date;
}

export function generateVerificationToken(): GeneratedToken {
  const raw = randomBytes(TOKEN_BYTES).toString('base64url');
  const hash = createHash('sha256').update(raw).digest('hex');
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_HOURS * 3600 * 1000);
  return { raw, hash, expiresAt };
}

export function hashVerificationToken(raw: string): string {
  return createHash('sha256').update(raw).digest('hex');
}

/**
 * Constant-time compare hash. Both args must be hex strings of same length.
 */
export function compareTokenHash(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

export function buildVerifyUrl(rawToken: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';
  const cleanBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${cleanBase}/api/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
}
