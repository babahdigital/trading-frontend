export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';

const inquirySchema = z.object({
  name: z.string().min(2, 'Nama minimal 2 karakter'),
  email: z.string().email('Email tidak valid'),
  phone: z.string().optional(),
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

  const inquiry = await prisma.inquiry.create({
    data: {
      ...parsed.data,
      package: parsed.data.package || 'VPS_LICENSE',
    },
  });

  // Telegram notification trigger (fire-and-forget)
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
  const telegramChatId = process.env.TELEGRAM_CHAT_ID;
  if (telegramBotToken && telegramChatId) {
    const text = `📩 *New Inquiry*\n\n*Name:* ${parsed.data.name}\n*Email:* ${parsed.data.email}\n*Phone:* ${parsed.data.phone || '-'}\n*Package:* ${parsed.data.package || 'VPS_LICENSE'}\n*Message:* ${parsed.data.message}`;
    fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: telegramChatId, text, parse_mode: 'Markdown' }),
    }).catch(() => {});
  }

  return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 });
}
