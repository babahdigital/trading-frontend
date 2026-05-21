/**
 * FE proxy untuk GET /api/tenants/{id}/portfolio — spot + futures breakdown.
 *
 * Backend rc38.1 — return breakdown {spot, futures, total} dengan asset
 * allocation per pair. Used by crypto dashboard untuk display portfolio
 * composition (donut/bar chart).
 *
 * Scope: KEYS (dashboard tier).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/portfolio');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    // Empty fallback supaya UI tidak crash (chart bisa show "no data" state)
    return NextResponse.json({
      source: 'mock',
      spot: { total_usdt: 0, assets: [] },
      futures: { total_usdt: 0, positions: [] },
      total_usdt: 0,
    });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'keys',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/portfolio`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      log.warn(`Portfolio backend HTTP ${res.status}`);
      return NextResponse.json(
        { source: 'backend', error: 'backend_failed', status: res.status, spot: { total_usdt: 0, assets: [] }, futures: { total_usdt: 0, positions: [] }, total_usdt: 0 },
        { status: 200 },
      );
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', ...body });
  } catch (err) {
    log.warn(`Portfolio error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({
      source: 'error',
      spot: { total_usdt: 0, assets: [] },
      futures: { total_usdt: 0, positions: [] },
      total_usdt: 0,
    });
  }
}
