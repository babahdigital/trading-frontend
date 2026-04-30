export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { tryNormalizePhone } from '@/lib/phone';

const inquirySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().trim().min(0).max(32).optional().or(z.literal('')),
  company: z.string().optional(),
  package: z.enum(['VPS_LICENSE', 'PAMM', 'SIGNAL', 'OTHER']).optional(),
  message: z.string().min(10, 'Pesan minimal 10 karakter'),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const parsed = inquirySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // Normalize phone ke E.164 — apapun input (0812.., +62.., +1..) jadi
  // canonical "+628..." / "+1..." supaya admin dapat wa.me deep-link.
  let phoneE164: string | null = null;
  if (parsed.data.phone && parsed.data.phone.trim().length >= 6) {
    const norm = tryNormalizePhone(parsed.data.phone);
    if (!norm) {
      return NextResponse.json(
        { error: { fieldErrors: { phone: ['Format nomor telpon tidak valid'] } } },
        { status: 400 },
      );
    }
    phoneE164 = norm.e164;
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: phoneE164,
      company: parsed.data.company,
      message: parsed.data.message,
      package: parsed.data.package || 'VPS_LICENSE',
    },
  });

  // Telegram notification trigger (fire-and-forget)
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  if (telegramBotToken && telegramChatId) {
    const waLine = phoneE164 ? `\n*WA:* https://wa.me/${phoneE164.replace(/^\+/, '')}` : '';
    const text = `📩 *New Inquiry*\n\n*Name:* ${parsed.data.name}\n*Email:* ${parsed.data.email}\n*Phone:* ${phoneE164 || '-'}${waLine}\n*Package:* ${parsed.data.package || 'VPS_LICENSE'}\n*Message:* ${parsed.data.message}`;
    fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'Markdown' }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 });
}
