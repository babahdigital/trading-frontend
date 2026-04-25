export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';
import { computePerformance, type Period } from '@/lib/analytics/compute';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/analytics/performance');

const ALLOWED_PERIODS: ReadonlySet<Period> = new Set(['7d', '30d', '90d', '1y', 'all']);

function parsePeriod(raw: string | null): Period {
  return raw && (ALLOWED_PERIODS as Set<string>).has(raw) ? (raw as Period) : '30d';
}

export async function GET(request: NextRequest) {
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  const period = parsePeriod(request.nextUrl.searchParams.get('period'));
  const pair = request.nextUrl.searchParams.get('pair') ?? '';
  const periodDays = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : period === '1y' ? 365 : 365;

  // Try master backend first (canonical aggregate)
  try {
    const qs = new URLSearchParams({ period_days: String(periodDays) });
    const res = await proxyToMasterBackend('stats', `/api/stats/performance?${qs}`, { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      return NextResponse.json({
        source: 'backend',
        period,
        tier: gate.effectiveTier,
        ...body,
      });
    }
    log.warn(`Performance backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Performance backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Fallback: derive from local SignalAuditLog
  try {
    const metrics = await computePerformance(period, pair || undefined);
    return NextResponse.json({
      source: 'local-fallback',
      period,
      tier: gate.effectiveTier,
      metrics,
    });
  } catch (err) {
    log.error(`Performance fallback error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
