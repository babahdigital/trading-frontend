import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const entries = await prisma.changelog.findMany({
    where: { isPublished: true },
    orderBy: { releasedAt: 'desc' },
    select: {
      id: true, version: true, title: true, title_en: true,
      body: true, body_en: true, category: true, releasedAt: true,
    },
  });
  return NextResponse.json(entries);
}
