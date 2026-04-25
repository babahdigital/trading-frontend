export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockEquitySeries } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/equity');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const from = request.nextUrl.searchParams.get('from') ?? '';
  const to = request.nextUrl.searchParams.get('to') ?? '';
  const tenantId = gate.subscription.cryptoTenantId;

  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', series: mockEquitySeries() });
  }

  try {
    const qs = new URLSearchParams();
    if (from) qs.set('from', from);
    if (to) qs.set('to', to);

    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/trading/${encodeURIComponent(tenantId)}/equity${qs.size ? `?${qs}` : ''}`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Equity backend HTTP ${res.status}`);
      return NextResponse.json({ source: 'mock', series: mockEquitySeries() });
    }
    const body = await res.json();
    const series = Array.isArray(body) ? body : Array.isArray(body.series) ? body.series : [];
    return NextResponse.json({ source: 'backend', series });
  } catch (err) {
    log.warn(`Equity error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', series: mockEquitySeries() });
  }
}
