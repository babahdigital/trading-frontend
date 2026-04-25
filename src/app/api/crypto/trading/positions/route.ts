export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockPositions } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/positions');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const market = request.nextUrl.searchParams.get('market_type') ?? '';
  const tenantId = gate.subscription.cryptoTenantId;

  if (!cryptoBackendConfigured() || !tenantId) {
    let items = mockPositions();
    if (market === 'spot' || market === 'futures') items = items.filter((p) => p.market_type === market);
    return NextResponse.json({ source: 'mock', items, count: items.length });
  }

  try {
    const qs = market ? `?market_type=${encodeURIComponent(market)}` : '';
    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/trading/${encodeURIComponent(tenantId)}/positions${qs}`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Positions backend HTTP ${res.status}`);
      const items = mockPositions();
      return NextResponse.json({ source: 'mock', items, count: items.length });
    }
    const body = await res.json();
    const items = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [];
    return NextResponse.json({ source: 'backend', items, count: items.length });
  } catch (err) {
    log.warn(`Positions error: ${err instanceof Error ? err.message : 'unknown'}`);
    const items = mockPositions();
    return NextResponse.json({ source: 'mock', items, count: items.length });
  }
}
