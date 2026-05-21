/**
 * Public active promotions API — FE consume untuk popup display + checkout
 * discount resolution.
 *
 * GET /api/cms/promotions/active?tier=CRYPTO_PRO  (optional tier filter)
 *
 * Returns Promotion list yang status=ACTIVE + startsAt <= now <= endsAt +
 * (kalau tier param: applicableTiers includes tier OR applicableTiers empty).
 *
 * Cache: 60s browser, 5min CDN — admin update triggers revalidate.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const tierFilter = request.nextUrl.searchParams.get('tier')?.toLowerCase();
  const localeParam = request.nextUrl.searchParams.get('locale')?.toLowerCase();
  // Default locale = id (Indonesia is primary market)
  const locale: 'id' | 'en' = localeParam === 'en' ? 'en' : 'id';

  const now = new Date();
  const promos = await prisma.promotion.findMany({
    where: {
      status: 'ACTIVE',
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { startsAt: 'desc' },
    select: {
      id: true,
      slug: true,
      name: true,
      name_en: true,
      description: true,
      description_en: true,
      discountType: true,
      discountValue: true,
      applicableTiers: true,
      maxUsage: true,
      currentUsage: true,
      popupTitle: true,
      popupTitle_en: true,
      popupBody: true,
      popupBody_en: true,
      heroImageUrl: true,
      heroImageUrl_en: true,
      ctaLabel: true,
      ctaLabel_en: true,
      ctaLink: true,
      popupTrigger: true,
      popupDelayMs: true,
      startsAt: true,
      endsAt: true,
      aiGenerated: true,
      calendarEventId: true,
      calendarEvent: { select: { slug: true, templateKey: true, name: true, country: true } },
    },
  });

  // Locale-aware event filter (Pak Abdullah directive 2026-05-21):
  //   - id locale: show all (national Indonesia + international)
  //   - en locale: hide ID-only events, show INTL + flash-sale (no event link)
  //   - Flash-sale (calendarEventId=null) = bilingual mandatory, always shown
  const localeFiltered = promos.filter((p) => {
    if (!p.calendarEventId) return true; // flash-sale, bilingual mandatory
    const country = p.calendarEvent?.country ?? 'ID';
    if (country === 'ID' && locale === 'en') return false;
    return true;
  });

  // Tier filter
  const tierFiltered = tierFilter
    ? localeFiltered.filter((p) => {
        const tiers = Array.isArray(p.applicableTiers) ? (p.applicableTiers as string[]) : [];
        return tiers.length === 0 || tiers.includes(tierFilter);
      })
    : localeFiltered;

  // Respect maxUsage
  const eligible = tierFiltered.filter((p) => p.maxUsage === 0 || p.currentUsage < p.maxUsage);

  return NextResponse.json({
    promotions: eligible.map((p) => ({
      ...p,
      discountValue: Number(p.discountValue),
    })),
    count: eligible.length,
  }, {
    headers: {
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
