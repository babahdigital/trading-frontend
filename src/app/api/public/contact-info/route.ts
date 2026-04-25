import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('api/public/contact-info');

const FALLBACK = {
  email: 'hello@babahalgo.com',
  whatsappUrl: null as string | null,
  whatsappLabel: null as string | null,
  telegramUrl: 'https://t.me/babahalgo' as string | null,
  exnessUrl: null as string | null,
};

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache: { ts: number; payload: typeof FALLBACK } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json(cache.payload);
  }

  try {
    const settings = await prisma.siteSetting.findMany({
      where: {
        key: {
          in: ['contact_email', 'whatsapp_number', 'telegram_url', 'exness_affiliate_url'],
        },
      },
      select: { key: true, value: true },
    });
    const map = new Map(settings.map((s) => [s.key, s.value]));
    const wa = (map.get('whatsapp_number') ?? '').trim();
    const tg = (map.get('telegram_url') ?? '').trim();
    const exness = (map.get('exness_affiliate_url') ?? '').trim();

    const payload = {
      email: (map.get('contact_email') ?? '').trim() || FALLBACK.email,
      whatsappUrl:
        wa && wa !== '#'
          ? wa.startsWith('http')
            ? wa
            : `https://wa.me/${wa.replace(/[^\d]/g, '')}`
          : null,
      whatsappLabel: wa && wa !== '#' ? 'WhatsApp' : null,
      telegramUrl: tg && tg !== '#' ? tg : FALLBACK.telegramUrl,
      exnessUrl: exness && exness !== '#' ? exness : null,
    };
    cache = { ts: Date.now(), payload };
    return NextResponse.json(payload);
  } catch (err) {
    log.warn(`contact-info read failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(FALLBACK);
  }
}
