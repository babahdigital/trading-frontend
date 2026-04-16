import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { z } from 'zod';

const registerSchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  tier: z.enum(['SIGNAL_BASIC', 'SIGNAL_VIP', 'PAMM_BASIC', 'PAMM_PRO']),
  // Opsional untuk PAMM
  brokerName: z.string().optional(),
  mt5Account: z.string().optional(),
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

      // Tentukan durasi subscription (30 hari default)
      const startsAt = new Date();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      // Set profit share untuk PAMM
      const isPamm = tier.startsWith('PAMM');
      const profitSharePct = isPamm ? (tier === 'PAMM_PRO' ? 20 : 25) : null;
      const monthlyFeeUsd = !isPamm ? (tier === 'SIGNAL_VIP' ? 149 : 49) : null;

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

    // Kirim notifikasi Telegram (fire-and-forget)
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
    console.error('Register error:', error);
    return NextResponse.json({ error: 'Terjadi kesalahan server' }, { status: 500 });
  }
}
