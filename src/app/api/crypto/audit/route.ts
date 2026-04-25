export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);

  const entries = await prisma.cryptoAuditTrail.findMany({
    where: { subscriptionId: gate.subscription.id },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, action: true, metadata: true, ipAddress: true, createdAt: true },
  });

  return NextResponse.json({ source: 'local', items: entries, count: entries.length });
}
