import { NextRequest, NextResponse } from 'next/server';
import { FaqCategory } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { localizeFaq } from '@/lib/i18n/localize-cms';

type FaqRow = Parameters<typeof localizeFaq>[0];

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

const VALID_CATEGORIES = new Set<FaqCategory>(['GENERAL', 'PRICING', 'TECHNICAL', 'SECURITY']);

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') ?? 'id';
  const categoryParam = request.nextUrl.searchParams.get('category');
  const category =
    categoryParam && VALID_CATEGORIES.has(categoryParam as FaqCategory)
      ? (categoryParam as FaqCategory)
      : null;
  const faqs = await prisma.faq.findMany({
    where: {
      isVisible: true,
      ...(category ? { category } : {}),
    },
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  });
  const localized = faqs.map((f: FaqRow) => localizeFaq(f, locale));
  return NextResponse.json(localized, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  });
}
