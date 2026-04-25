export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';
import { computePnlSeries, type Period } from '@/lib/analytics/compute';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/analytics/pnl');

const ALLOWED_PERIODS: ReadonlySet<Period> = new Set(['7d', '30d', '90d', '1y', 'all']);

function parsePeriod(raw: string | null): Period {
  return raw && (ALLOWED_PERIODS as Set<string>).has(raw) ? (raw as Period) : '30d';
}

/**
 * Realized PnL time series — daily buckets with cumulative equity curve.
 * Backend doesn't expose a daily series endpoint yet, so derived locally
 * from SignalAuditLog mirror.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  const period = parsePeriod(request.nextUrl.searchParams.get('period'));
  const pair = request.nextUrl.searchParams.get('pair') ?? '';

  try {
    const series = await computePnlSeries(period, pair || undefined);
    const total = series.length > 0 ? series[series.length - 1].cumulative_pnl : 0;
    return NextResponse.json({
      source: 'local',
      period,
      tier: gate.effectiveTier,
      total_pnl_usd: total,
      series,
    });
  } catch (err) {
    log.error(`PnL series error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
