import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { localizePricingTier } from '@/lib/i18n/localize-cms';
import type { PricingTier } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'id';
  const tiers = await prisma.pricingTier.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' },
  });
  const localized = tiers.map((t: PricingTier) => localizePricingTier(t, locale));
  return NextResponse.json(localized, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  });
}
