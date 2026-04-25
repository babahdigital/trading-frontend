export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';
import { computeDrawdown, type Period } from '@/lib/analytics/compute';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/analytics/drawdown');

const ALLOWED_PERIODS: ReadonlySet<Period> = new Set(['7d', '30d', '90d', '1y', 'all']);

function parsePeriod(raw: string | null): Period {
  return raw && (ALLOWED_PERIODS as Set<string>).has(raw) ? (raw as Period) : '30d';
}

/**
 * Equity drawdown — peak/trough/max DD, plus daily series for charting.
 * Computed locally from SignalAuditLog cumulative PnL.
 */
export async function GET(request: NextRequest) {
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  const period = parsePeriod(request.nextUrl.searchParams.get('period'));
  const pair = request.nextUrl.searchParams.get('pair') ?? '';

  try {
    const summary = await computeDrawdown(period, pair || undefined);
    return NextResponse.json({
      source: 'local',
      period,
      tier: gate.effectiveTier,
      ...summary,
    });
  } catch (err) {
    log.error(`Drawdown error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
