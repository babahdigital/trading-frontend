import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { sendEmail } from '@/lib/notifier/email';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/register');

// Canonical tier slugs per audit 2026-04-26 (PAMM tiers deprecated, zero-custody model).
// SIGNAL_BASIC retained as alias for SIGNAL_STARTER for backward-compat with existing rows.
const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  tier: z.enum([
    'DEMO',
    'SIGNAL_STARTER',
    'SIGNAL_BASIC',
    'SIGNAL_PRO',
    'SIGNAL_VIP',
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
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 });
    }

    const { name, email, password, tier, brokerName, mt5Account } = parsed.data;

    // Cek email duplikat
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });
    }

    // Cek MT5 account duplikat (jika diberikan)
    if (mt5Account) {
      const existingMt5 = await prisma.user.findUnique({ where: { mt5Account } });
      if (existingMt5) {
        return NextResponse.json({ error: 'MT5 account sudah terdaftar' }, { status: 409 });
      }
    }

    const passwordHash = await hashPassword(password);

    // Buat user + subscription dalam transaksi
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'CLIENT',
          mt5Account: mt5Account || null,
        },
      });

      // Tentukan durasi subscription (30 hari default; demo 30 hari fixed)
      const startsAt = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Canonical pricing per audit 2026-04-26 — Signal 3-tier
      const monthlyFeeUsd = (() => {
        if (tier === 'DEMO') return 0;
        if (tier === 'SIGNAL_VIP') return 299;
        if (tier === 'SIGNAL_PRO') return 79;
        // SIGNAL_STARTER + legacy SIGNAL_BASIC alias both → $19
        return 19;
      })();
      const profitSharePct = null; // No profit-share for Signal/Demo (only Crypto Bot, handled in /api/crypto)

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

    // Kirim welcome email ke user (fire-and-forget)
    sendEmail(
      email,
      'Selamat Datang di BabahAlgo',
      `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#333">
        <h2 style="color:#d97706">Selamat Datang, ${name}!</h2>
        <p>Terima kasih telah mendaftar di <strong>BabahAlgo</strong>.</p>
        <p>Paket yang dipilih: <strong>${tier.replace('_', ' ')}</strong></p>
        <h3>Langkah Selanjutnya:</h3>
        <ol>
          <li>Tunggu aktivasi akun oleh tim kami (maks 24 jam)</li>
          <li>Setup Telegram Bot: buka <a href="https://t.me/babahalgo_bot">@babahalgo_bot</a> → ketik /start → copy Chat ID</li>
          <li>Paste Chat ID di <a href="https://babahalgo.com/portal/account">Portal > Settings > Notifications</a></li>
          <li>Setelah aktif, sinyal trading akan otomatis masuk ke Telegram & email Anda</li>
        </ol>
        <p style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px">
          <strong>Butuh bantuan?</strong> Balas email ini atau hubungi kami di
          <a href="mailto:hello@babahalgo.com">hello@babahalgo.com</a>
        </p>
        <hr style="border:none;border-top:1px solid #eee;margin:24px 0">
        <p style="font-size:12px;color:#999">
          <em>Disclaimer: Trading berisiko tinggi. Sinyal bukan saran investasi. Pastikan memahami risiko sebelum trading.</em>
        </p>
      </div>`,
    ).catch((err) => log.warn(`Welcome email failed for ${email}: ${err}`));

    return NextResponse.json({
      message: 'Registrasi berhasil. Akun Anda akan diaktivasi oleh admin.',
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
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
