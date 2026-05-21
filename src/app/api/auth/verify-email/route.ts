/**
 * GET /api/auth/verify-email?token=<raw>
 *
 * 2026-05-20 — Phase A polish. Customer click magic link dari email
 * verification → backend hash & compare token → set User.emailVerifiedAt.
 *
 * Token single-use, expires 24h, hashed at rest.
 * Redirect to /login?verified=1 (atau /portal kalau session active).
 * No JSON response — kustomer always lihat HTML page atau redirect.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashVerificationToken } from '@/lib/auth/email-verification';
import { sendEmail } from '@/lib/notifier/email';
import { renderWelcomeEmail } from '@/lib/email/welcome-template';
import { detectRequestLocale } from '@/lib/i18n/server-locale';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/auth/verify-email');

function redirect(url: string): NextResponse {
  return NextResponse.redirect(url, 303);
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const rawToken = request.nextUrl.searchParams.get('token');

  if (!rawToken || rawToken.length < 16) {
    return redirect(`${cleanBase}/login?verified=invalid`);
  }

  const tokenHash = hashVerificationToken(rawToken);

  try {
    const row = await prisma.emailVerificationToken.findUnique({
      where: { token: tokenHash },
    });
    if (!row) {
      return redirect(`${cleanBase}/login?verified=invalid`);
    }
    if (row.usedAt) {
      return redirect(`${cleanBase}/login?verified=used`);
    }
    if (row.expiresAt.getTime() < Date.now()) {
      return redirect(`${cleanBase}/login?verified=expired`);
    }

    // Mark token used + user verified — single transaction.
    // Subscription tier di-resolve dari relation (User model tidak punya
    // field langsung — pakai Subscription[].tier latest ACTIVE row).
    const [, userAfter] = await prisma.$transaction([
      prisma.emailVerificationToken.update({
        where: { id: row.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: row.userId },
        data: { emailVerifiedAt: new Date() },
        select: {
          id: true, email: true, name: true,
          subscriptions: {
            where: { status: 'ACTIVE' },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { tier: true },
          },
        },
      }),
    ]);

    log.info(`email verified userId=${row.userId}`);

    // Welcome email — fire NOW (post-verify, sesuai directive Pak Abdullah
    // 2026-05-21). Pre-verify customer cuma terima magic-link email; setelah
    // verify success, FE redirect ke /login?verified=success + welcome email
    // arrived independently. Best-effort, fail-soft (tidak block redirect).
    try {
      const locale = detectRequestLocale(request);
      const tier = userAfter.subscriptions[0]?.tier ?? 'DEMO';
      const welcomeContent = renderWelcomeEmail(locale, {
        name: userAfter.name ?? userAfter.email.split('@')[0],
        tier,
      });
      sendEmail(userAfter.email, welcomeContent.subject, welcomeContent.html)
        .catch((err) => log.warn(`Welcome email failed for ${userAfter.email}: ${err}`));
    } catch (err) {
      log.warn(`Welcome email enqueue failed userId=${row.userId}: ${err instanceof Error ? err.message : 'unknown'}`);
    }

    return redirect(`${cleanBase}/login?verified=success`);
  } catch (err) {
    log.error(`verify-email error: ${err instanceof Error ? err.message : 'unknown'}`);
    return redirect(`${cleanBase}/login?verified=error`);
  }
}
