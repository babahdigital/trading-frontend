import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 3600;

export async function GET() {
  const testimonials = await prisma.testimonial.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' },
  });
  return NextResponse.json(testimonials, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' },
  });
}
