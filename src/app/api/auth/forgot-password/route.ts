import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/notifier/email';
import { detectRequestLocale } from '@/lib/i18n/server-locale';
import { renderResetPasswordEmail } from '@/lib/email/reset-password-template';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/forgot-password');

// Returns { code, error } shape — frontend resolves via errors.auth.<code>.
function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

const forgotSchema = z.object({
  email: z.string().email('Format email tidak valid'),
});

const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_WINDOW = 3;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const PUBLIC_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://babahalgo.com';

function getClientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = forgotSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          code: 'validation_failed',
          error: 'Validation failed',
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { email } = parsed.data;
    const ipAddress = getClientIp(request);
    const userAgent = request.headers.get('user-agent');

    // Rate-limit per IP — at most 3 forgot-password requests per hour. We
    // count audit_log rows since they exist regardless of whether the email
    // matched a real user, so attackers can't probe ip-based throttling.
    if (ipAddress) {
      const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
      const recentCount = await prisma.auditLog.count({
        where: {
          action: 'password_reset_requested',
          ipAddress,
          createdAt: { gt: since },
        },
      });
      if (recentCount >= MAX_REQUESTS_PER_WINDOW) {
        return errorResponse(
          'rate_limited',
          'Too many password reset requests. Please try again in an hour.',
          429,
        );
      }
    }

    const user = await prisma.user.findUnique({ where: { email } });

    // Always audit-log the attempt (even if email unknown) for IP rate-limit
    // accounting + security monitoring.
    await prisma.auditLog.create({
      data: {
        userId: user?.id ?? null,
        action: 'password_reset_requested',
        ipAddress,
        userAgent,
        metadata: {
          emailHash: sha256Hex(email.toLowerCase()),
          userFound: Boolean(user),
        },
      },
    });

    if (user) {
      // Invalidate any prior unused tokens for this user — only the most
      // recent reset link should ever be redeemable.
      await prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      // Issue raw token + persist its SHA-256 hash. Raw token is only ever
      // present in the email body; never logged, never persisted.
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = sha256Hex(rawToken);
      const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          token: tokenHash,
          expiresAt,
          ipAddress,
          userAgent,
        },
      });

      const resetUrl = `${PUBLIC_BASE_URL}/reset-password?token=${rawToken}`;
      const locale = detectRequestLocale(request);
      const content = renderResetPasswordEmail(locale, {
        name: user.name || user.email,
        resetUrl,
      });

      // Fire-and-forget; never let SMTP errors leak whether the email exists.
      sendEmail(user.email, content.subject, content.html).catch((err) =>
        log.warn(`Reset email failed for user ${user.id}: ${err}`),
      );
    }

    // Always return the same success payload — never disclose whether the
    // email is registered (timing-attack mitigation).
    return NextResponse.json(
      {
        code: 'reset_link_sent',
        message: 'If the email is registered, a reset link has been sent.',
      },
      { status: 200 },
    );
  } catch (error) {
    log.error('Forgot password error:', error);
    return errorResponse('internal_error', 'Internal server error', 500);
  }
}
