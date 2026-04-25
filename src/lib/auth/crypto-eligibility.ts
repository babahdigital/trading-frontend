/**
 * Crypto product eligibility — gate for /api/crypto/* routes.
 * Returns full subscription record for downstream tier-aware logic.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { CryptoBotSubscription } from '@prisma/client';

export interface CryptoEligibilityOk {
  ok: true;
  userId: string;
  isAdmin: boolean;
  subscription: CryptoBotSubscription;
}

export interface CryptoEligibilityFail {
  ok: false;
  response: NextResponse;
}

export type CryptoEligibilityResult = CryptoEligibilityOk | CryptoEligibilityFail;

/**
 * Resolve user's crypto subscription. Optional `requireKeyConnected` enforces
 * Binance API key linked (for trading endpoints). Optional `allowPaused`
 * lets paused subs read-only on monitoring endpoints.
 */
export async function requireCryptoEligible(
  request: NextRequest,
  opts: { requireKeyConnected?: boolean; allowPaused?: boolean } = {},
): Promise<CryptoEligibilityResult> {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const subscription = await prisma.cryptoBotSubscription.findUnique({
    where: { userId },
  });

  if (!subscription) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'no_active_subscription',
          message: 'Belum berlangganan Crypto Bot — pilih paket di /pricing.',
          ctaUrl: '/pricing#crypto',
        },
        { status: 403 },
      ),
    };
  }

  const allowedStatuses = opts.allowPaused
    ? new Set(['ACTIVE', 'PAUSED'])
    : new Set(['ACTIVE']);

  if (!allowedStatuses.has(subscription.status)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'subscription_inactive',
          message: `Status langganan: ${subscription.status}. Aktifkan dulu di /portal/account/billing.`,
          status: subscription.status,
        },
        { status: 403 },
      ),
    };
  }

  if (opts.requireKeyConnected && !subscription.apiKeyConnected) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'binance_key_not_connected',
          message: 'Hubungkan Binance API key dulu di /portal/crypto/connect.',
          ctaUrl: '/portal/crypto/connect',
        },
        { status: 403 },
      ),
    };
  }

  const isAdmin = request.headers.get('x-user-role') === 'ADMIN';
  return { ok: true, userId, isAdmin, subscription };
}
