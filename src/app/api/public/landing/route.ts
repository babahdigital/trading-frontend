import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { localizeLandingSection } from '@/lib/i18n/localize-cms';

type Section = Parameters<typeof localizeLandingSection>[0];

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'id';
  const sections = await prisma.landingSection.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' },
  });
  const localized = sections.map((s: Section) => ({
    ...s,
    ...localizeLandingSection(s, locale),
  }));
  return NextResponse.json(localized, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  });
}
