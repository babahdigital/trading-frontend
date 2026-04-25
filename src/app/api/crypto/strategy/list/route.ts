export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockStrategies } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/strategy/list');

const TIER_RANK: Record<string, number> = {
  CRYPTO_BASIC: 1,
  CRYPTO_PRO: 2,
  CRYPTO_HNWI: 3,
};

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  if (!cryptoBackendConfigured()) {
    const userRank = TIER_RANK[gate.subscription.tier] ?? 1;
    const items = mockStrategies().map((s) => ({
      ...s,
      available: (TIER_RANK[s.min_tier] ?? 1) <= userRank,
    }));
    return NextResponse.json({ source: 'mock', items, tier: gate.subscription.tier });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'signals',
      path: '/api/strategy/list',
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Strategy list backend HTTP ${res.status}`);
      const userRank = TIER_RANK[gate.subscription.tier] ?? 1;
      const items = mockStrategies().map((s) => ({ ...s, available: (TIER_RANK[s.min_tier] ?? 1) <= userRank }));
      return NextResponse.json({ source: 'mock', items, tier: gate.subscription.tier });
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', items: body.items ?? body, tier: gate.subscription.tier });
  } catch (err) {
    log.warn(`Strategy list error: ${err instanceof Error ? err.message : 'unknown'}`);
    const userRank = TIER_RANK[gate.subscription.tier] ?? 1;
    const items = mockStrategies().map((s) => ({ ...s, available: (TIER_RANK[s.min_tier] ?? 1) <= userRank }));
    return NextResponse.json({ source: 'mock', items, tier: gate.subscription.tier });
  }
}
