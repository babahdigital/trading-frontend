export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockStrategies } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/strategy/list');

/**
 * Read tenant's enrolled strategies. Per Sprint X+1.2 the strategy
 * configuration moved out of customer scope — operator-managed only,
 * so this endpoint is read-only.
 */
export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', items: mockStrategies(), tier: gate.subscription.tier });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'signals',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/strategies`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Strategy list backend HTTP ${res.status}`);
      return NextResponse.json({ source: 'mock', items: mockStrategies(), tier: gate.subscription.tier });
    }
    const body = await res.json();
    const items = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [];
    return NextResponse.json({ source: 'backend', items, tier: gate.subscription.tier });
  } catch (err) {
    log.warn(`Strategy list error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', items: mockStrategies(), tier: gate.subscription.tier });
  }
}
