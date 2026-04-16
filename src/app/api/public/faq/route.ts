import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { localizeFaq } from '@/lib/i18n/localize-cms';
import type { Faq } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'id';
  const faqs = await prisma.faq.findMany({
    where: { isVisible: true },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  const localized = faqs.map((f: Faq) => localizeFaq(f, locale));
  return NextResponse.json(localized, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  });
}
