import { createHash, randomInt } from 'crypto';

const OTP_LENGTH = 6;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_ATTEMPTS = 5;

/**
 * Generate a numeric OTP using crypto.randomInt for uniform distribution.
 * 6 digits = 10^6 search space; combined with 5-attempt cap and 10-minute
 * TTL the brute-force surface is negligible.
 */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(OTP_LENGTH, '0');
}

/**
 * Hash OTP with the server-side secret. We store only the hash so a
 * dump of `WhatsappVerification` cannot reveal the codes.
 */
export function hashOtp(otp: string): string {
  const secret = process.env.WA_OTP_HASH_SECRET || process.env.JWT_SECRET || '';
  if (!secret) {
    throw new Error('WA_OTP_HASH_SECRET or JWT_SECRET must be set to hash OTP codes');
  }
  return createHash('sha256').update(`${otp}:${secret}`).digest('hex');
}

export function otpExpiry(now: Date = new Date()): Date {
  return new Date(now.getTime() + OTP_TTL_MS);
}

export const OTP_CONSTANTS = {
  TTL_MS: OTP_TTL_MS,
  LENGTH: OTP_LENGTH,
  MAX_ATTEMPTS,
} as const;
