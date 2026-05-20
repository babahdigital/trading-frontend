/**
 * POST /api/auth/resend-verification
 *
 * 2026-05-20 — Phase A polish. Customer hilang/expired email verify link
 * → request resend via portal banner atau standalone page. Rate limited
 * untuk avoid abuse (5/hour/IP via middleware global + per-user soft cap
 * di sini).
 *
 * Auth: session JWT required (portal context). Verify status check:
 * - already verified → 409 already_verified
 * - rate limit (max 3 token gen in 1 hour per user) → 429
 * - else: invalidate existing unused tokens, generate new, send email
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import { detectRequestLocale } from '@/lib/i18n/server-locale';
import { sendEmail } from '@/lib/notifier/email';
import {
  generateVerificationToken,
  buildVerifyUrl,
  EMAIL_VERIFICATION_TTL_HOURS,
} from '@/lib/auth/email-verification';
import { renderVerifyEmail } from '@/lib/email/verify-email-template';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/auth/resend-verification');

const HOURLY_TOKEN_CAP = 3;

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailVerifiedAt: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'user_not_found' }, { status: 404 });
    }
    if (user.emailVerifiedAt) {
      return NextResponse.json({ error: 'already_verified' }, { status: 409 });
    }

    // Soft cap: max N token gen per hour per user
    const oneHourAgo = new Date(Date.now() - 3600 * 1000);
    const recentCount = await prisma.emailVerificationToken.count({
      where: { userId, createdAt: { gte: oneHourAgo } },
    });
    if (recentCount >= HOURLY_TOKEN_CAP) {
      return NextResponse.json(
        { error: 'rate_limited', message: 'Too many resend attempts. Try again in 1 hour.' },
        { status: 429 },
      );
    }

    // Invalidate previous unused tokens (single-use semantic — only newest valid)
    await prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });

    const { raw, hash, expiresAt } = generateVerificationToken();
    await prisma.emailVerificationToken.create({
      data: { userId, token: hash, expiresAt },
    });

    const locale = detectRequestLocale(request);
    const verifyUrl = buildVerifyUrl(raw);
    const content = renderVerifyEmail(locale, {
      name: user.name ?? user.email,
      verifyUrl,
      expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
    });

    // Fire-and-forget — return success immediately, email arrives async
    sendEmail(user.email, content.subject, content.html).catch((err) =>
      log.warn(`resend verify email failed for ${user.email}: ${err}`),
    );

    log.info(`resend verify userId=${userId}`);
    return NextResponse.json({ ok: true, message: 'Verification email sent' });
  } catch (err) {
    log.error(`resend-verification error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
