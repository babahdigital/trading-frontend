export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockTradingStatus } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/status');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', tier: gate.subscription.tier, ...mockTradingStatus() });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/trading/${encodeURIComponent(tenantId)}/status`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Trading status backend HTTP ${res.status}`);
      return NextResponse.json({ source: 'mock', tier: gate.subscription.tier, ...mockTradingStatus() });
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', tier: gate.subscription.tier, ...body });
  } catch (err) {
    log.warn(`Trading status error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', tier: gate.subscription.tier, ...mockTradingStatus() });
  }
}
