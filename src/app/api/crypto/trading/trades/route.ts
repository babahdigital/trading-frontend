export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockTrades } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/trades');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const from = request.nextUrl.searchParams.get('from') ?? '';
  const to = request.nextUrl.searchParams.get('to') ?? '';
  const market = request.nextUrl.searchParams.get('market') ?? '';
  const tenantId = gate.subscription.cryptoTenantId;

  if (!cryptoBackendConfigured() || !tenantId) {
    const items = mockTrades().slice(0, limit);
    return NextResponse.json({ source: 'mock', items, count: items.length });
  }

  try {
    const qs = new URLSearchParams();
    qs.set('limit', String(limit));
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);
    if (market) qs.set('market', market);

    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/trading/${encodeURIComponent(tenantId)}/trades?${qs}`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Trades backend HTTP ${res.status}`);
      const items = mockTrades();
      return NextResponse.json({ source: 'mock', items, count: items.length });
    }
    const body = await res.json();
    const items = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [];
    return NextResponse.json({ source: 'backend', items, count: items.length });
  } catch (err) {
    log.warn(`Trades error: ${err instanceof Error ? err.message : 'unknown'}`);
    const items = mockTrades();
    return NextResponse.json({ source: 'mock', items, count: items.length });
  }
}
