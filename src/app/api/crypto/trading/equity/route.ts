export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockEquityHistory } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/equity');

/**
 * Equity history — proxies `/api/tenants/{id}/equity/history?limit=`.
 * Default 288 (24h @ 5min snapshots), max 2880.
 */
export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const limit = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? '288', 10) || 288, 1), 2880);
  const tenantId = gate.subscription.cryptoTenantId;

  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', series: mockEquityHistory(limit) });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/equity/history?limit=${limit}`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Equity backend HTTP ${res.status}`);
      return NextResponse.json({ source: 'mock', series: mockEquityHistory(limit) });
    }
    const body = await res.json();
    const series = Array.isArray(body) ? body : Array.isArray(body.series) ? body.series : [];
    return NextResponse.json({ source: 'backend', series });
  } catch (err) {
    log.warn(`Equity error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', series: mockEquityHistory(limit) });
  }
}
