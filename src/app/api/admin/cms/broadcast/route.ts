/**
 * POST /api/admin/cms/broadcast — admin email broadcast endpoint.
 *
 * Pak Abdullah audit 2026-05-22: "email promo bila ada kirimkan ke user juga".
 *
 * Recipient pool (selectable):
 *   - 'subscribers': Subscriber.status=ACTIVE (newsletter signup)
 *   - 'users': User where role=CLIENT AND emailVerifiedAt IS NOT NULL
 *   - 'all': union of both, dedupe by email
 *
 * Throttling: send in batches of 50 dengan 1s delay (Brevo rate limit safety).
 * Idempotency: jobId stored in BroadcastJob table (TODO: add table), prevent
 * duplicate sends.
 *
 * Auth: x-user-role=ADMIN (set by middleware after JWT verify).
 *
 * Body shape:
 *   {
 *     promoId?: string,              // pick from Promotion DB
 *     audience: 'subscribers' | 'users' | 'all',
 *     locale?: 'id' | 'en' | 'auto', // 'auto' = per-recipient
 *     dryRun?: boolean,
 *   }
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/notifier/email';
import { renderPromoBroadcast } from '@/lib/email/promo-broadcast-template';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/cms/broadcast');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 1000;

function isAdmin(req: NextRequest): boolean {
  return req.headers.get('x-user-role') === 'ADMIN';
}

interface Recipient { email: string; name?: string | null; locale: 'id' | 'en' }

async function resolveRecipients(audience: string): Promise<Recipient[]> {
  const map = new Map<string, Recipient>();

  if (audience === 'subscribers' || audience === 'all') {
    const subs = await prisma.subscriber.findMany({
      where: { status: 'ACTIVE' },
      select: { email: true, name: true, locale: true },
    });
    for (const s of subs) {
      map.set(s.email.toLowerCase(), {
        email: s.email,
        name: s.name,
        locale: s.locale === 'en' ? 'en' : 'id',
      });
    }
  }

  if (audience === 'users' || audience === 'all') {
    const users = await prisma.user.findMany({
      where: { role: 'CLIENT', emailVerifiedAt: { not: null }, isActive: true },
      select: { email: true, name: true, locale: true },
    });
    for (const u of users) {
      const k = u.email.toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          email: u.email,
          name: u.name,
          locale: u.locale === 'en' ? 'en' : 'id',
        });
      }
    }
  }

  return Array.from(map.values());
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { promoId, audience = 'subscribers', locale = 'auto', dryRun = false } = body as {
    promoId?: string;
    audience?: 'subscribers' | 'users' | 'all';
    locale?: 'id' | 'en' | 'auto';
    dryRun?: boolean;
  };

  if (!promoId) {
    return NextResponse.json({ error: 'promoId required' }, { status: 400 });
  }

  const promo = await prisma.promotion.findUnique({
    where: { id: promoId },
    select: {
      id: true, slug: true,
      name: true, name_en: true,
      popupTitle: true, popupTitle_en: true,
      popupBody: true, popupBody_en: true,
      description: true, description_en: true,
      ctaLabel: true, ctaLabel_en: true,
      ctaLink: true,
      heroImageUrl: true, heroImageUrl_en: true,
      discountType: true, discountValue: true,
      endsAt: true,
    },
  });
  if (!promo) {
    return NextResponse.json({ error: 'promo_not_found' }, { status: 404 });
  }

  const recipients = await resolveRecipients(audience);

  if (dryRun) {
    return NextResponse.json({
      ok: true,
      dryRun: true,
      audience,
      recipientCount: recipients.length,
      sample: recipients.slice(0, 5).map((r) => ({ email: r.email, locale: r.locale })),
      promo: { id: promo.id, slug: promo.slug, name: promo.name },
    });
  }

  // Build per-locale promo content once for efficiency
  const renderFor = (recipientLocale: 'id' | 'en', recipientName?: string | null) => {
    const targetLocale = locale === 'auto' ? recipientLocale : locale;
    const isEn = targetLocale === 'en';
    const promoTitle = (isEn && promo.popupTitle_en ? promo.popupTitle_en : promo.popupTitle) ?? (isEn && promo.name_en ? promo.name_en : promo.name);
    const promoBody = (isEn && promo.popupBody_en ? promo.popupBody_en : promo.popupBody) ?? (isEn && promo.description_en ? promo.description_en : promo.description);
    const ctaLabel = (isEn && promo.ctaLabel_en ? promo.ctaLabel_en : promo.ctaLabel) ?? (isEn ? 'See the offer' : 'Lihat penawaran');
    const ctaUrl = `${APP_URL}${promo.ctaLink ?? '/pricing'}`;
    const heroImage = isEn ? (promo.heroImageUrl_en ?? promo.heroImageUrl) : (promo.heroImageUrl ?? promo.heroImageUrl_en);
    const heroFullUrl = heroImage?.startsWith('http') ? heroImage : (heroImage ? `${APP_URL}${heroImage}` : undefined);
    const discountVal = Number(promo.discountValue);
    const discountText = discountVal > 0
      ? promo.discountType === 'PERCENT' ? `${discountVal}%` : `Rp ${discountVal.toLocaleString('id-ID')}`
      : undefined;
    const validUntil = promo.endsAt
      ? promo.endsAt.toLocaleDateString(isEn ? 'en-US' : 'id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
      : undefined;

    return renderPromoBroadcast(targetLocale, {
      recipientName: recipientName ?? undefined,
      promoTitle,
      promoBody,
      ctaLabel,
      ctaUrl,
      discountText,
      heroImageUrl: heroFullUrl,
      validUntil,
    });
  };

  // Batch send dengan throttle
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(async (r) => {
      try {
        const content = renderFor(r.locale, r.name);
        await sendEmail(r.email, content.subject, content.html);
        sent++;
      } catch (err) {
        failed++;
        const msg = err instanceof Error ? err.message : 'unknown';
        if (errors.length < 5) errors.push(`${r.email}: ${msg}`);
      }
    }));
    // Throttle next batch
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((res) => setTimeout(res, BATCH_DELAY_MS));
    }
  }

  log.info(`Promo broadcast ${promo.slug} → audience=${audience} recipients=${recipients.length} sent=${sent} failed=${failed}`);

  return NextResponse.json({
    ok: true,
    promoId,
    promoSlug: promo.slug,
    audience,
    recipientCount: recipients.length,
    sent,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  });
}
