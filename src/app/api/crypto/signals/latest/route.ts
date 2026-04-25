export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockSignals } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/signals/latest');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);
  const tenantId = gate.subscription.cryptoTenantId;

  if (!cryptoBackendConfigured()) {
    const items = mockSignals().slice(0, limit);
    return NextResponse.json({ source: 'mock', items, count: items.length });
  }

  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (tenantId) qs.set('tenant_id', tenantId);
    const res = await proxyToCryptoBackend({
      scope: 'signals',
      path: `/api/signals/latest?${qs}`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Crypto signals backend HTTP ${res.status}`);
      const items = mockSignals().slice(0, limit);
      return NextResponse.json({ source: 'mock', items, count: items.length });
    }
    const body = await res.json();
    const items = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [];
    return NextResponse.json({ source: 'backend', items, count: items.length });
  } catch (err) {
    log.warn(`Crypto signals error: ${err instanceof Error ? err.message : 'unknown'}`);
    const items = mockSignals().slice(0, limit);
    return NextResponse.json({ source: 'mock', items, count: items.length });
  }
}
