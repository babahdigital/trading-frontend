import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET() {
  const now = new Date();
  const popups = await prisma.popup.findMany({
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
  return NextResponse.json(popups, {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  });
}
