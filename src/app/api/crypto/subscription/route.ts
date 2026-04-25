export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { cryptoBackendConfigured } from '@/lib/proxy/crypto-client';

/**
 * Read current user's crypto bot subscription state.
 * Returns 200 with `null` data when user has no sub (don't 404 — the page
 * uses this to render the "subscribe" CTA).
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sub = await prisma.cryptoBotSubscription.findUnique({
    where: { userId },
    select: {
      id: true,
      tier: true,
      status: true,
      apiKeyConnected: true,
      apiKeyVerifiedAt: true,
      monthlyFeeUsd: true,
      profitSharePct: true,
      activatedAt: true,
      expiresAt: true,
      nextBillingAt: true,
      maxLeverage: true,
      maxPairs: true,
      selectedStrategy: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    backend_available: cryptoBackendConfigured(),
    subscription: sub
      ? {
          ...sub,
          monthlyFeeUsd: Number(sub.monthlyFeeUsd),
          profitSharePct: Number(sub.profitSharePct),
        }
      : null,
  });
}
