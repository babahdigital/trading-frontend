export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockPositions } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/positions');

/**
 * Live positions — backend auto-filters by tenant context, so we just
 * forward `status` query (open|closing|closed|closed_external|close_failed).
 */
export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const status = request.nextUrl.searchParams.get('status') ?? 'open';

  if (!cryptoBackendConfigured()) {
    return NextResponse.json({ source: 'mock', items: mockPositions(), count: mockPositions().length });
  }

  try {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/positions${qs}`,
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
