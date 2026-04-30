import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { InquiryPackage } from '@prisma/client';
import { z } from 'zod';
import { tryNormalizePhone } from '@/lib/phone';

const TOPIC_TO_PACKAGE: Record<string, InquiryPackage> = {
  signal: 'SIGNAL',
  pamm: 'PAMM',
  license: 'VPS_LICENSE',
  institutional: 'VPS_LICENSE',
  partnership: 'OTHER',
  support: 'OTHER',
  compliance: 'OTHER',
  other: 'OTHER',
};

const inquirySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  // Phone optional (boleh kosong). Format apapun — normalize di handler.
  phone: z.string().trim().min(0).max(32).optional().or(z.literal('')),
  topic: z.string().min(1, 'Topic is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = inquirySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    let phone: string | null = null;
    if (parsed.data.phone && parsed.data.phone.trim().length >= 6) {
      const norm = tryNormalizePhone(parsed.data.phone);
      if (!norm) {
        return NextResponse.json(
          { error: { fieldErrors: { phone: ['Invalid phone number'] } } },
          { status: 400 },
        );
      }
      phone = norm.e164;
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone,
        message: `[${parsed.data.topic}] ${parsed.data.message}`,
        package: TOPIC_TO_PACKAGE[parsed.data.topic] || 'OTHER',
      },
    });

    // Telegram notification (fire-and-forget)
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    if (telegramBotToken && telegramChatId) {
      const text = `New Contact Inquiry\n\nName: ${parsed.data.name}\nEmail: ${parsed.data.email}${phone ? `\nWhatsApp: ${phone}` : ''}\nTopic: ${parsed.data.topic}\nMessage: ${parsed.data.message}`;
      fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
