export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

function requireAdmin(request: NextRequest): NextResponse | null {
  const role = request.headers.get('x-user-role');
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return null;
}

export async function GET(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const status = request.nextUrl.searchParams.get('status') ?? '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);

  const where: Record<string, unknown> = {};
  if (['NOT_SUBMITTED', 'PENDING_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED'].includes(status)) {
    where.status = status;
  }

  const items = await prisma.userKyc.findMany({
    where,
    orderBy: { submittedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      userId: true,
      status: true,
      fullName: true,
      documentType: true,
      submittedAt: true,
      reviewedAt: true,
      reviewedBy: true,
      rejectionReason: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json({ items, count: items.length });
}
