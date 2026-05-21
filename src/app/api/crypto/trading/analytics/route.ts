export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockAnalytics } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/trading/analytics');

/**
 * Analytics combined proxy — fetch daily PnL + performance summary dari
 * backend `/api/tenants/{id}/analytics/pnl` + `/analytics/performance`.
 *
 * Backend item #6 (Pak Abdullah Phase 14W) — shipped 2026-05-21.
 *
 * Period mapping:
 *   1D  → days=1
 *   7D  → days=7
 *   30D → days=30 (default)
 *   90D → days=90
 *
 * Response shape:
 *   {
 *     source: 'mock' | 'backend',
 *     available: boolean,           // false jika backend belum live
 *     daily: [{date, pnl_usdt, trades_count, win_rate}],
 *     summary: { total_pnl_usdt, win_rate, profit_factor, sharpe, max_drawdown_pct },
 *   }
 */
const PERIOD_DAYS: Record<string, number> = {
  '1D': 1, '7D': 7, '30D': 30, '90D': 90,
};

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const periodParam = request.nextUrl.searchParams.get('period') ?? '30D';
  const days = PERIOD_DAYS[periodParam] ?? 30;
  const tenantId = gate.subscription.cryptoTenantId;

  if (!cryptoBackendConfigured() || !tenantId) {
    const mock = mockAnalytics(days);
    return NextResponse.json({ source: 'mock', available: true, ...mock });
  }

  try {
    // Backend rc38.1 scope mapping: analytics endpoint = KEYS (dashboard tier)
    const [pnlRes, perfRes] = await Promise.all([
      proxyToCryptoBackend({
        scope: 'keys',
        path: `/api/tenants/${encodeURIComponent(tenantId)}/analytics/pnl?days=${days}`,
        forwardUserId: gate.userId,
      }),
      proxyToCryptoBackend({
        scope: 'keys',
        path: `/api/tenants/${encodeURIComponent(tenantId)}/analytics/performance?days=${days}`,
        forwardUserId: gate.userId,
      }),
    ]);

    // Kalau salah satu 404 = endpoint belum deploy → graceful "available: false"
    if (pnlRes.status === 404 || perfRes.status === 404) {
      log.info(`Analytics endpoint not yet live (pnl=${pnlRes.status} perf=${perfRes.status})`);
      return NextResponse.json({ source: 'backend', available: false, daily: [], summary: null });
    }

    if (!pnlRes.ok || !perfRes.ok) {
      log.warn(`Analytics backend pnl=${pnlRes.status} perf=${perfRes.status}`);
      const mock = mockAnalytics(days);
      return NextResponse.json({ source: 'mock', available: true, ...mock });
    }

    const pnlBody = await pnlRes.json();
    const perfBody = await perfRes.json();

    return NextResponse.json({
      source: 'backend',
      available: true,
      daily: Array.isArray(pnlBody.daily) ? pnlBody.daily : Array.isArray(pnlBody) ? pnlBody : [],
      summary: perfBody.summary ?? perfBody ?? null,
    });
  } catch (err) {
    log.warn(`Analytics error: ${err instanceof Error ? err.message : 'unknown'}`);
    const mock = mockAnalytics(days);
    return NextResponse.json({ source: 'mock', available: true, ...mock });
  }
}
