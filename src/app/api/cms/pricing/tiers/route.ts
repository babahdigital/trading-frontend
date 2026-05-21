/**
 * Public pricing tiers API — single source of truth dari PricingTier DB.
 *
 * Centralization 2026-05-21 (Pak Abdullah directive): replace hardcoded
 * pricing di pricing/page.tsx, landing-client.tsx, checkout/route.ts dengan
 * DB-backed lookup. Admin edit via /admin/cms/pricing → 1 tempat update,
 * semua surface re-sync.
 *
 * Filters: `?category=CRYPTO|SIGNAL|VPS|DEMO` (default: all visible).
 *
 * Cache: 5-min ISR via Next cache, invalidated saat admin update.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

const VALID_CATEGORIES = ['SIGNAL', 'CRYPTO', 'VPS', 'DEMO', 'INSTITUTIONAL'] as const;
type CategoryFilter = (typeof VALID_CATEGORIES)[number];

export async function GET(request: NextRequest) {
  const categoryParam = request.nextUrl.searchParams.get('category')?.toUpperCase();
  const productSlug = request.nextUrl.searchParams.get('product')?.toLowerCase();

  const where: Record<string, unknown> = { isVisible: true };
  if (categoryParam && VALID_CATEGORIES.includes(categoryParam as CategoryFilter)) {
    where.category = categoryParam;
  }
  if (productSlug) where.productSlug = productSlug;

  const tiers = await prisma.pricingTier.findMany({
    where,
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      slug: true,
      category: true,
      productSlug: true,
      name: true,
      name_en: true,
      price: true,
      priceIdr: true,
      priceUsd: true,
      subtitle: true,
      subtitle_en: true,
      features: true,
      features_en: true,
      excluded: true,
      ctaLabel: true,
      ctaLabel_en: true,
      ctaLink: true,
      popular: true,
      sortOrder: true,
      metadata: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    tiers,
    count: tiers.length,
    generatedAt: new Date().toISOString(),
  }, {
    headers: {
      // Browser cache 60s, CDN 5 min (Cloudflare). Admin update triggers
      // revalidatePath() di /api/admin/cms/pricing.
      'Cache-Control': 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400',
    },
  });
}
