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
      ctaLabel: true,
      ctaLabel_en: true,
      ctaLink: true,
      popupTrigger: true,
      popupDelayMs: true,
      startsAt: true,
      endsAt: true,
      aiGenerated: true,
      calendarEvent: { select: { slug: true, templateKey: true, name: true } },
    },
  });

  // Filter by tier kalau provided
  const filtered = tierFilter
    ? promos.filter((p) => {
        const tiers = Array.isArray(p.applicableTiers) ? (p.applicableTiers as string[]) : [];
        return tiers.length === 0 || tiers.includes(tierFilter);
      })
    : promos;

  // Respect maxUsage
  const eligible = filtered.filter((p) => p.maxUsage === 0 || p.currentUsage < p.maxUsage);

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
