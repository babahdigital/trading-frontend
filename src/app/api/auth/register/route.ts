import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/notifier/email';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { detectRequestLocale } from '@/lib/i18n/server-locale';
import { renderWelcomeEmail } from '@/lib/email/welcome-template';
import { renderVerifyEmail } from '@/lib/email/verify-email-template';
import {
  generateVerificationToken,
  buildVerifyUrl,
  EMAIL_VERIFICATION_TTL_HOURS,
} from '@/lib/auth/email-verification';
import { forexSignup } from '@/lib/forex/auth';
import { ForexApiError } from '@/lib/forex/types';

const log = createLogger('api/auth/register');

// Returns { code, error } shape so frontend can resolve via errors.register.<code>
// localized lookup. English string preserved as fallback for non-i18n consumers.
function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

// Canonical tier slugs per audit 2026-04-26 + 2026-05-20 unified registration refactor.
// PAMM tiers deprecated 2026-04-26 (zero-custody model). SIGNAL_BASIC retained sebagai
// alias untuk SIGNAL_STARTER kompat backward dengan existing rows.
// FREE + CRYPTO_* tiers ditambahkan 2026-05-20 saat unified `/register?service=X` flow
// di-rilis — sebelumnya hanya signal tiers yang diterima endpoint ini.
const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  tier: z.enum([
    'DEMO',
    'FREE',
    'SIGNAL_STARTER',
    'SIGNAL_BASIC',
    'SIGNAL_PRO',
    'SIGNAL_VIP',
    // Crypto rc29 5-tier (2026-05-21): demo + starter + active + pro + hnwi.
    // CRYPTO_BASIC retained sebagai legacy alias (grandfathered).
    'CRYPTO_BASIC',
    'CRYPTO_STARTER',
    'CRYPTO_ACTIVE',
    'CRYPTO_PRO',
    'CRYPTO_HNWI',
  ]),
  accountType: z.enum(['demo', 'live']).optional(),
  brokerName: z.string().optional(),
  mt5Account: z.string().optional(),
  product: z.enum(['signal', 'crypto', 'vps']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        code: 'validation_failed',
        error: 'Validation failed',
        fieldErrors: parsed.error.flatten().fieldErrors,
      }, { status: 400 });
    }

    const { name, email, password, tier, brokerName, mt5Account } = parsed.data;

    // Cek email duplikat
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return errorResponse('email_already_registered', 'Email already registered', 409);
    }

    // Cek MT5 account duplikat (jika diberikan)
    if (mt5Account) {
      const existingMt5 = await prisma.user.findUnique({ where: { mt5Account } });
      if (existingMt5) {
        return errorResponse('mt5_already_registered', 'MT5 account already registered', 409);
      }
    }

    const passwordHash = await hashPassword(password);

    // Capture locale dari request — persistent di User.locale supaya sync
    // across devices saat login (Pak Abdullah 2026-05-22 audit).
    const registrationLocale = detectRequestLocale(request);

    // Buat user + subscription dalam transaksi
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'CLIENT',
          mt5Account: mt5Account || null,
          locale: registrationLocale,
        },
      });

      // Tentukan durasi subscription (30 hari default; demo 30 hari fixed)
      const startsAt = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Canonical pricing per audit 2026-04-26 + 2026-05-20 expansion
      // (FREE, CRYPTO_*). Updated dari single-product signal-only ke
      // multi-product unified registration.
      const monthlyFeeUsd = (() => {
        if (tier === 'DEMO' || tier === 'FREE') return 0;
        if (tier === 'SIGNAL_VIP') return 299;
        if (tier === 'SIGNAL_PRO') return 79;
        if (tier === 'SIGNAL_STARTER' || tier === 'SIGNAL_BASIC') return 39;
        if (tier === 'CRYPTO_HNWI') return 499;
        if (tier === 'CRYPTO_PRO') return 199;
        if (tier === 'CRYPTO_BASIC') return 49;
        return 0;
      })();
      const profitSharePct = null; // Zero-custody — semua tier flat monthly fee

      const subscription = await tx.subscription.create({
        data: {
          userId: user.id,
          tier,
          status: 'PENDING', // Admin harus aktivasi
          startsAt,
          expiresAt,
          profitSharePct,
          monthlyFeeUsd,
          brokerAccountId: brokerName || null,
          metadata: {
            registeredAt: new Date().toISOString(),
            registrationTier: tier,
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'register',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          metadata: { tier, method: 'self_register' },
        },
      });

      return { user, subscription };
    });

    // Phase 14V FE bridge — best-effort provision a backend tenant via
    // `POST /api/forex/auth/signup`. The returned plaintext api_token is
    // stored encrypted at rest in User.forexApiToken so subsequent /login
    // can bridge the browser to a backend JWT pair. Failure NEVER blocks
    // the FE-side registration — customer can be linked later by ops.
    //
    // Skip backend bridge untuk FREE/DEMO (no broker account) dan crypto
    // (separate Binance bridge path). Forex bridge hanya untuk SIGNAL_* tiers.
    const isSignalLiveTier = tier !== 'DEMO' && tier !== 'FREE' && !tier.startsWith('CRYPTO_');
    if (isSignalLiveTier) {
      try {
        const signup = await forexSignup({
          email,
          displayName: name,
          language: detectRequestLocale(request) === 'en' ? 'en' : 'id',
          timezone: 'Asia/Jakarta',
        });
        await prisma.user.update({
          where: { id: result.user.id },
          data: {
            forexTenantId: signup.tenant_id,
            forexApiToken: signup.api_token,
            forexLinkedAt: new Date(),
          },
        });
        log.info(`forex tenant provisioned for ${email} tenant_id=${signup.tenant_id}`);
      } catch (bridgeErr) {
        if (bridgeErr instanceof ForexApiError) {
          log.warn(`forex signup failed for ${email}: ${bridgeErr.code} (${bridgeErr.status})`);
        } else {
          log.error('forex signup unexpected:', bridgeErr);
        }
        // best-effort: customer record exists, ops will link manually
      }
    }

    // Kirim notifikasi Telegram ke admin (fire-and-forget)
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      const msg = `🆕 *Registrasi Baru*\n\nNama: ${name}\nEmail: ${email}\nPaket: ${tier}\n${mt5Account ? `MT5: ${mt5Account}\n` : ''}Status: PENDING (perlu aktivasi)`;
      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: msg, parse_mode: 'Markdown' }),
      }).catch(() => {});
    }

    // Locale dari registration request (sudah dipakai untuk User.locale di atas)
    const locale = registrationLocale;

    // Welcome email TIDAK dikirim di sini.
    // 2026-05-21 (per directive Pak Abdullah) — welcome email dipindah ke
    // /api/auth/verify-email handler supaya hanya fire SETELAH user benar-
    // benar verify email. Pre-verify, customer cuma terima 1 email = magic
    // link verifikasi. Welcome email = onboarding cue → fire setelah trust
    // established (email verified).
    //
    // Free/Demo tier: tidak ada verification step (skip), jadi welcome
    // dikirim langsung di register flow untuk path itu.
    if (tier === 'DEMO' || tier === 'FREE') {
      const welcomeContent = renderWelcomeEmail(locale, { name, tier });
      sendEmail(email, welcomeContent.subject, welcomeContent.html)
        .catch((err) => log.warn(`Welcome email failed for ${email}: ${err}`));
    }

    // Email verification (Phase A polish 2026-05-20) — best-effort.
    // Generate token, store hashed, send magic link via email.
    // Skip kalau FREE/DEMO tier (no friction untuk trial users).
    if (tier !== 'DEMO' && tier !== 'FREE') {
      try {
        const { raw, hash, expiresAt } = generateVerificationToken();
        await prisma.emailVerificationToken.create({
          data: { userId: result.user.id, token: hash, expiresAt },
        });
        const verifyUrl = buildVerifyUrl(raw);
        const verifyContent = renderVerifyEmail(locale, {
          name,
          verifyUrl,
          expiresInHours: EMAIL_VERIFICATION_TTL_HOURS,
        });
        sendEmail(email, verifyContent.subject, verifyContent.html).catch((err) =>
          log.warn(`Verify email send failed for ${email}: ${err}`),
        );
      } catch (verifyErr) {
        log.warn(
          `Verify token generation failed for ${email}: ${verifyErr instanceof Error ? verifyErr.message : 'unknown'}`,
        );
      }
    }

    return NextResponse.json({
      code: 'register_success',
      // Locale-agnostic English message; frontend should display via
      // i18n register.* success keys.
      message: 'Registration successful. Your account will be activated by an admin.',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      subscription: {
        id: result.subscription.id,
        tier: result.subscription.tier,
        status: result.subscription.status,
      },
    }, { status: 201 });
  } catch (error) {
    log.error('Register error:', error);
    return errorResponse('internal_error', 'Internal server error', 500);
  }
}
