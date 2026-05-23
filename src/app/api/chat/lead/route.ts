/**
 * Chat lead capture endpoint.
 *
 * Pre-flight gate untuk chat-widget — calon user wajib submit nama/email/
 * telpon sebelum bisa kirim pesan ke AI. Setelah submit:
 *   - Insert ke ChatLead table (idempotent dedup by email + phone hari ini)
 *   - Optional: jika consentMarketing=true, juga insert ke Subscriber
 *     (CHAT_LEAD source) — supaya bisa di-include di blast riset.
 *   - Telegram alert ke admin (fire-and-forget) supaya tim bisa proactive
 *     follow-up via WhatsApp.
 *
 * Anti-spam: rate-limit per IP via shared rate limiter; juga validasi
 * format phone (E.164-ish) dan email (zod).
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { createLogger } from '@/lib/logger';
import { tryNormalizePhone } from '@/lib/phone';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/chat/lead');

const leadSchema = z.object({
  name: z.string().trim().min(2, 'name_too_short').max(80, 'name_too_long'),
  email: z.string().trim().toLowerCase().email('email_invalid'),
  // Phone optional — top-of-funnel chat lead cukup nama+email per Pak
  // Abdullah 2026-04-30 (friction terlalu tinggi). Normalisasi E.164 saat
  // ada nilai. Phone tetap dikumpulkan di Inquiry form + register flow.
  phone: z.string().trim().min(0).max(32).optional().or(z.literal('')),
  locale: z.enum(['id', 'en']).optional().default('id'),
  referrerPath: z.string().max(255).optional(),
  consentMarketing: z.boolean().optional().default(false),
});

function getClientIp(req: NextRequest): string | null {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return null;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_json' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      { error: 'validation_failed', details: flat.fieldErrors },
      { status: 400 },
    );
  }

  // Phone optional — kalau ada, normalize ke E.164. Reject kalau format
  // tidak parseable. Empty/null lewat tanpa error.
  let phoneE164: string | null = null;
  let phoneCountry: string | undefined;
  if (parsed.data.phone && parsed.data.phone.trim().length >= 6) {
    const phoneNorm = tryNormalizePhone(parsed.data.phone);
    if (!phoneNorm) {
      return NextResponse.json(
        { error: 'validation_failed', details: { phone: ['phone_invalid'] } },
        { status: 400 },
      );
    }
    phoneE164 = phoneNorm.e164;
    phoneCountry = phoneNorm.country;
  }

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent')?.slice(0, 500) ?? null;

  try {
    // Dedup ringan: kalau email sudah ada lead status NEW dalam 24 jam
    // terakhir, update saja (jangan bikin duplicate). Tetap return 200
    // supaya UX flow tidak break — user tidak tahu perbedaan internal.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await prisma.chatLead.findFirst({
      where: { email: parsed.data.email, status: 'NEW', createdAt: { gte: since } },
      orderBy: { createdAt: 'desc' },
    });

    let leadId: string;
    if (existing) {
      const updated = await prisma.chatLead.update({
        where: { id: existing.id },
        data: {
          name: parsed.data.name,
          phone: phoneE164 ?? existing.phone,
          locale: parsed.data.locale,
          referrerPath: parsed.data.referrerPath ?? existing.referrerPath,
          consentMarketing: parsed.data.consentMarketing || existing.consentMarketing,
          ipAddress: ipAddress ?? existing.ipAddress,
          userAgent: userAgent ?? existing.userAgent,
        },
      });
      leadId = updated.id;
    } else {
      const created = await prisma.chatLead.create({
        data: {
          name: parsed.data.name,
          email: parsed.data.email,
          phone: phoneE164,
          locale: parsed.data.locale,
          referrerPath: parsed.data.referrerPath,
          consentMarketing: parsed.data.consentMarketing,
          ipAddress,
          userAgent,
        },
      });
      leadId = created.id;
    }

    // Auto-subscribe ke newsletter kalau consent — upsert by email supaya
    // tidak crash kalau user submit ulang.
    if (parsed.data.consentMarketing) {
      await prisma.subscriber
        .upsert({
          where: { email: parsed.data.email },
          update: {
            name: parsed.data.name,
            ...(phoneE164 ? { phone: phoneE164 } : {}),
            locale: parsed.data.locale,
            status: 'ACTIVE',
          },
          create: {
            email: parsed.data.email,
            name: parsed.data.name,
            phone: phoneE164,
            locale: parsed.data.locale,
            source: 'CHAT_LEAD',
            ipAddress,
            userAgent,
          },
        })
        .catch((err: unknown) => {
          // Subscriber upsert non-blocking — chat lead masuk tetap success
          log.warn(`subscriber upsert failed: ${err instanceof Error ? err.message : 'unknown'}`);
        });
    }

    // Telegram alert (fire-and-forget) — biar admin tahu ada lead baru
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID;
    if (telegramBotToken && telegramChatId && !existing) {
      const phoneLine = phoneE164
        ? `\nTelpon: ${phoneE164}${phoneCountry ? ` (${phoneCountry})` : ''}\nWA: https://wa.me/${phoneE164.replace(/^\+/, '')}`
        : '';
      const text = `Chat Lead baru\n\nNama: ${parsed.data.name}\nEmail: ${parsed.data.email}${phoneLine}\nFrom: ${parsed.data.referrerPath ?? '(unknown)'}\nNewsletter: ${parsed.data.consentMarketing ? 'YES' : 'no'}`;
      fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, leadId }, { status: 201 });
  } catch (err) {
    log.error(`chat lead create failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'internal_error' }, { status: 500 });
  }
}
