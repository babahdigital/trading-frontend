export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import { isValidWhatsappTarget } from '@/lib/whatsapp/format';
import { generateOtp, hashOtp, otpExpiry, OTP_CONSTANTS } from '@/lib/whatsapp/otp';

const log = createLogger('api/client/whatsapp/verify');

const bodySchema = z.object({
  product: z.enum(['forex', 'crypto']),
  e164: z.string().refine((v) => isValidWhatsappTarget(v), { message: 'invalid_e164' }),
}).strict();

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 3;

/**
 * Send OTP via backend internal endpoint when available, fall back to
 * Fonnte direct. Returns the channel actually used so the FE can surface
 * accurate delivery info.
 */
async function sendOtp(product: 'forex' | 'crypto', e164: string, otp: string): Promise<'backend' | 'fonnte_direct' | null> {
  // 1) Preferred: backend internal OTP endpoint (audit chain integrated).
  const backendBase = product === 'crypto' ? process.env.CRYPTO_BACKEND_URL : process.env.VPS1_BACKEND_URL;
  const backendToken = product === 'crypto'
    ? (process.env.CRYPTO_TOKEN_ADMIN || '')
    : (process.env.VPS1_TOKEN_TENANT_ADMIN || process.env.VPS1_ADMIN_TOKEN || '');
  if (backendBase && backendToken) {
    try {
      const path = product === 'crypto' ? '/api/internal/whatsapp/otp/send' : '/api/forex/internal/whatsapp/otp/send';
      const res = await fetch(`${backendBase.replace(/\/$/, '')}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-API-Token': backendToken },
        body: JSON.stringify({ to: e164, code: otp, ttl_seconds: Math.floor(OTP_CONSTANTS.TTL_MS / 1000) }),
        signal: AbortSignal.timeout(8_000),
      });
      if (res.ok) return 'backend';
      // 404/405 means endpoint not yet implemented — silently fall through.
      if (res.status !== 404 && res.status !== 405) {
        log.warn(`backend OTP send returned ${res.status}`);
      }
    } catch (err) {
      log.warn(`backend OTP send threw: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 2) Fallback: direct Fonnte send. Audit row is the WhatsappVerification record itself.
  const fonnteToken = process.env.FONNTE_TOKEN;
  if (!fonnteToken) {
    log.error('No backend OTP endpoint and FONNTE_TOKEN missing — cannot send OTP');
    return null;
  }
  try {
    const target = e164.startsWith('+') ? e164.slice(1) : e164;
    const message = `Kode verifikasi BabahAlgo: ${otp}\nKadaluarsa ${Math.floor(OTP_CONSTANTS.TTL_MS / 60_000)} menit. Jangan bagikan kode ini.`;
    const res = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: fonnteToken },
      body: new URLSearchParams({ target, message, countryCode: '62' }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      log.warn(`Fonnte send returned ${res.status}`);
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (data && data.status === false) {
      log.warn(`Fonnte send rejected: ${data.reason ?? 'unknown'}`);
      return null;
    }
    return 'fonnte_direct';
  } catch (err) {
    log.error('Fonnte send threw', err);
    return null;
  }
}

/**
 * POST /api/client/whatsapp/verify
 *
 * Mints a 6-digit OTP, persists hash + TTL in WhatsappVerification, and
 * triggers delivery (backend preferred, Fonnte fallback).
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'invalid_payload' }, { status: 400 });
  }

  const { product, e164 } = parsed.data;

  // Rate limit per user — at most 3 OTP requests per minute.
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.whatsappVerification.count({
    where: { userId, product, createdAt: { gt: since } },
  });
  if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
    return NextResponse.json({ error: 'rate_limited_try_again_soon' }, { status: 429 });
  }

  const otp = generateOtp();
  const verification = await prisma.whatsappVerification.create({
    data: {
      userId,
      product,
      e164,
      otpHash: hashOtp(otp),
      expiresAt: otpExpiry(),
    },
    select: { id: true, expiresAt: true },
  });

  const via = await sendOtp(product, e164, otp);
  if (!via) {
    return NextResponse.json(
      {
        error: 'otp_send_failed',
        verificationId: verification.id,
        expiresAt: verification.expiresAt.toISOString(),
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    verificationId: verification.id,
    expiresAt: verification.expiresAt.toISOString(),
    via,
  });
}
