/**
 * Shared eligibility check for /api/client/* routes.
 *
 * Resolves user + active subscription/license, returns gate result. Centralized
 * so tier rules stay consistent across signals/analytics/positions/AI routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export interface EligibilityOk {
  ok: true;
  userId: string;
  isAdmin: boolean;
  subscriptionTier: string | null;
  licenseType: string | null;
  effectiveTier: string;
}

export interface EligibilityFail {
  ok: false;
  response: NextResponse;
}

export type EligibilityResult = EligibilityOk | EligibilityFail;

const SIGNAL_OR_PAMM = /^SIGNAL_|^PAMM_/i;
const ELIGIBLE_LICENSES = new Set(['VPS_INSTALLATION', 'SIGNAL_SUBSCRIBER']);

export async function requireSignalEligible(request: NextRequest): Promise<EligibilityResult> {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: { where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' }, take: 1 },
      licenses: { where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' }, take: 1 },
    },
  });
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  const role = request.headers.get('x-user-role');
  const isAdmin = role === 'ADMIN';
  const subscriptionTier = user.subscriptions[0]?.tier ?? null;
  const licenseType = user.licenses[0]?.type ?? null;

  const eligible = isAdmin
    || (subscriptionTier ? SIGNAL_OR_PAMM.test(subscriptionTier) : false)
    || (licenseType ? ELIGIBLE_LICENSES.has(licenseType) : false);

  if (!eligible) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'Subscription required',
          message: 'Berlangganan Signal Service untuk mengakses fitur ini.',
          ctaUrl: '/pricing',
        },
        { status: 403 },
      ),
    };
  }

  const effectiveTier = subscriptionTier ?? licenseType ?? 'FREE';

  return {
    ok: true,
    userId,
    isAdmin,
    subscriptionTier,
    licenseType,
    effectiveTier,
  };
}
