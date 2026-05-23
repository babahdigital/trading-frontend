import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET() {
  try {
  const now = new Date();
  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      OR: [
        { startsAt: null, endsAt: null },
        { startsAt: { lte: now }, endsAt: null },
        { startsAt: null, endsAt: { gte: now } },
        { startsAt: { lte: now }, endsAt: { gte: now } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(banners, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
