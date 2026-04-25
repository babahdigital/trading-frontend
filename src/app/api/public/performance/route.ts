import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { computePnlSeries, computePerformance } from '@/lib/analytics/compute';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('api/public/performance');

interface EquityPoint {
  time: string;
  value: number;
}

interface KPI {
  totalReturn: string;
  sharpeRatio: string;
  sortinoRatio: string;
  profitFactor: string;
  winRate: string;
  maxDrawdown: string;
  avgHoldTime: string;
  recoveryFactor: string;
}

const STARTING_BALANCE = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

let cache: { ts: number; equity: EquityPoint[]; kpi: KPI } | null = null;

function pct(num: number): string {
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

async function buildFromBackend(): Promise<{ equity: EquityPoint[]; kpi: KPI } | null> {
  try {
    const res = await proxyToMasterBackend('stats', '/api/stats/performance?period_days=365', { method: 'GET' });
    if (!res.ok) return null;
    const body = await res.json();
    const m = body.metrics;
    if (!m) return null;
    const ret = m.total_pnl_usd ? (m.total_pnl_usd / STARTING_BALANCE) * 100 : 0;
    return {
      equity: [],
      kpi: {
        totalReturn: pct(ret),
        sharpeRatio: m.sharpe_ratio?.toFixed(2) ?? '—',
        sortinoRatio: m.sortino_ratio?.toFixed(2) ?? '—',
        profitFactor: typeof m.profit_factor === 'number' ? m.profit_factor.toFixed(2) : '—',
        winRate: typeof m.win_rate === 'number' ? `${(m.win_rate * 100).toFixed(1)}%` : '—',
        maxDrawdown: m.max_drawdown_pct ? `-${m.max_drawdown_pct.toFixed(1)}%` : '—',
        avgHoldTime: m.avg_hold_seconds ? `${(m.avg_hold_seconds / 3600).toFixed(1)}h` : '—',
        recoveryFactor: m.recovery_factor?.toFixed(1) ?? '—',
      },
    };
  } catch (err) {
    log.warn(`Backend performance fetch failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

async function buildFromLocal(): Promise<{ equity: EquityPoint[]; kpi: KPI }> {
  const series = await computePnlSeries('1y');
  const perf = await computePerformance('1y');

  const equity: EquityPoint[] = series.map((s) => ({
    time: s.date,
    value: Number((STARTING_BALANCE + s.cumulative_pnl).toFixed(2)),
  }));

  const totalRet = equity.length > 0
    ? ((equity[equity.length - 1].value - STARTING_BALANCE) / STARTING_BALANCE) * 100
    : 0;

  let peak = STARTING_BALANCE;
  let maxDdPct = 0;
  for (const p of equity) {
    if (p.value > peak) peak = p.value;
    const dd = ((peak - p.value) / peak) * 100;
    if (dd > maxDdPct) maxDdPct = dd;
  }

  const kpi: KPI = {
    totalReturn: pct(totalRet),
    sharpeRatio: '—',
    sortinoRatio: '—',
    profitFactor: perf.profit_factor > 0 ? perf.profit_factor.toFixed(2) : '—',
    winRate: perf.total_trades > 0 ? `${(perf.win_rate * 100).toFixed(1)}%` : '—',
    maxDrawdown: maxDdPct > 0 ? `-${maxDdPct.toFixed(1)}%` : '—',
    avgHoldTime: '—',
    recoveryFactor: maxDdPct > 0 && perf.total_pnl_usd > 0 ? (perf.total_pnl_usd / (peak * maxDdPct / 100)).toFixed(1) : '—',
  };

  return { equity, kpi };
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL_MS) {
    return NextResponse.json({ source: 'cache', equity: cache.equity, kpi: cache.kpi });
  }

  // Try backend first
  const fromBackend = await buildFromBackend();
  if (fromBackend) {
    cache = { ts: Date.now(), ...fromBackend };
    return NextResponse.json({ source: 'backend', ...fromBackend });
  }

  // Fall back to local SignalAuditLog
  try {
    const fromLocal = await buildFromLocal();
    cache = { ts: Date.now(), ...fromLocal };
    return NextResponse.json({ source: 'local', ...fromLocal });
  } catch (err) {
    log.error(`Local performance build failed: ${err instanceof Error ? err.message : 'unknown'}`);
    // Last resort: empty payload — UI must handle "no data yet" gracefully
    return NextResponse.json({
      source: 'empty',
      equity: [],
      kpi: {
        totalReturn: '—', sharpeRatio: '—', sortinoRatio: '—', profitFactor: '—',
        winRate: '—', maxDrawdown: '—', avgHoldTime: '—', recoveryFactor: '—',
      },
    });
  }
}

void prisma;
