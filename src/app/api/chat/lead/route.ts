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
  // Phone format apapun — normalisasi ke E.164 di handler. Schema cuma jaga
  // panjang (min 6 digit setelah strip non-digit).
  phone: z
    .string()
    .trim()
    .min(6, 'phone_too_short')
    .max(32, 'phone_too_long'),
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
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return NextResponse.json(
      { error: 'validation_failed', details: flat.fieldErrors },
      { status: 400 },
    );
  }

  // Normalisasi phone ke E.164 — apapun input (0812.., +62812.., +1...)
  // disimpan canonical "+62812345678" supaya admin click wa.me langsung
  // jalan + dedup phone-by-phone presisi.
  const phoneNorm = tryNormalizePhone(parsed.data.phone);
  if (!phoneNorm) {
    return NextResponse.json(
      { error: 'validation_failed', details: { phone: ['phone_invalid'] } },
      { status: 400 },
    );
  }
  const phoneE164 = phoneNorm.e164;

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
          phone: phoneE164,
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
            phone: phoneE164,
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
      const text = `Chat Lead baru\n\nNama: ${parsed.data.name}\nEmail: ${parsed.data.email}\nTelpon: ${phoneE164} (${phoneNorm.country ?? '?'})\nFrom: ${parsed.data.referrerPath ?? '(unknown)'}\nNewsletter: ${parsed.data.consentMarketing ? 'YES' : 'no'}\nWA: https://wa.me/${phoneNorm.whatsappDigits}`;
      fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: telegramChatId, text }),
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, leadId }, { status: 201 });
  } catch (err) {
    log.error(`chat lead create failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
