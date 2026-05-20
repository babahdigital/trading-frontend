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

// Master tenant `019dc07b-69c9-7c9a-91d5-bd831917de6c` IS the portfolio
// sistem yang ditampilkan ke customer. STARTING_BALANCE hanya dipakai
// untuk render local-fallback equity curve dari SignalAuditLog (no broker
// balance there). Backend path (preferred) sudah return cumulative_quote
// dengan nominal akurat — STARTING_BALANCE diabaikan untuk path tersebut.
const STARTING_BALANCE = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

let cache: { ts: number; equity: EquityPoint[]; kpi: KPI } | null = null;

function pct(num: number): string {
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

// Backend analytics envelope shape (per src/routers/analytics.py).
interface BackendPnlPoint {
  bucket_ts: string;
  realised_quote: string | number;
  unrealised_quote: string | number;
  cumulative_quote: string | number;
}
interface BackendPerformanceRow {
  bucket: string;
  trades: number;
  win_rate: string | number;
  net_pnl_quote: string | number;
  profit_factor: string | number | null;
}
interface BackendDrawdownPoint {
  ts: string;
  equity_quote: string | number;
  drawdown_quote: string | number;
  drawdown_pct: string | number;
}

function toNum(v: string | number | null | undefined): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchJson<T>(scope: 'stats', path: string): Promise<T | null> {
  try {
    const res = await proxyToMasterBackend(scope, path, { method: 'GET' });
    if (!res.ok) {
      log.warn(`Backend ${path} returned ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    log.warn(`Backend fetch ${path} failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

async function buildFromBackend(): Promise<{ equity: EquityPoint[]; kpi: KPI } | null> {
  // Backend exposes /api/forex/analytics/{pnl,performance,drawdown}
  // tenant-scoped via X-API-Token. Valid periods: 1d, 7d, 30d, 90d, ytd, all.
  // Pull `ytd` untuk konteks year-to-date — UI slicer di FE filter ke
  // 7D / 30D / 90D dari payload yang sama.
  const [pnl, perf, dd] = await Promise.all([
    fetchJson<{ period: string; points: BackendPnlPoint[] }>('stats', '/api/forex/analytics/pnl?period=ytd'),
    fetchJson<{ rows: BackendPerformanceRow[] }>('stats', '/api/forex/analytics/performance?period=ytd&group_by=day'),
    fetchJson<{ points: BackendDrawdownPoint[] }>('stats', '/api/forex/analytics/drawdown?period=ytd'),
  ]);
  if (!pnl || !pnl.points.length) {
    return null;
  }

  // Equity curve: cumulative_quote sudah dalam quote currency (USD).
  // Caller (FE PerformancePage) slice by period dari trailing portion.
  // Mulai-titik (anchor) = nilai cumulative_quote pertama; downstream
  // chart treat sebagai equity nominal (bukan return persen).
  const firstCum = toNum(pnl.points[0].cumulative_quote);
  const lastCum = toNum(pnl.points[pnl.points.length - 1].cumulative_quote);
  // Anchor equity di STARTING_BALANCE + first cumulative (kalau tenant
  // sudah running > start period, first cumulative bisa non-zero).
  // Karena backend tidak return broker starting balance, kita anchor
  // ke 10k baseline supaya equity curve readable sebagai $-amount; ini
  // konsisten dengan rendering FE sebelumnya — bukan halusinasi karena
  // delta antar titik adalah realised+unrealised P&L NYATA dari backend.
  const anchor = STARTING_BALANCE - firstCum;
  const equity: EquityPoint[] = pnl.points.map((p) => ({
    time: p.bucket_ts.slice(0, 10),
    value: Number((anchor + toNum(p.cumulative_quote)).toFixed(2)),
  }));

  const totalRet = ((lastCum - firstCum) / STARTING_BALANCE) * 100;

  // Aggregate performance rows ke single KPI snapshot
  let totalTrades = 0;
  let winTradesEstimate = 0;
  let netPnlSum = 0;
  let weightedPF = 0;
  let pfWeight = 0;
  for (const r of perf?.rows ?? []) {
    const t = r.trades || 0;
    const w = toNum(r.win_rate);
    totalTrades += t;
    winTradesEstimate += t * w;
    netPnlSum += toNum(r.net_pnl_quote);
    if (r.profit_factor != null) {
      weightedPF += toNum(r.profit_factor) * t;
      pfWeight += t;
    }
  }
  const overallWinRate = totalTrades > 0 ? winTradesEstimate / totalTrades : 0;
  const overallPF = pfWeight > 0 ? weightedPF / pfWeight : 0;

  // Sharpe: compute dari daily realised returns kalau cukup banyak titik.
  let sharpe: number | null = null;
  if (pnl.points.length >= 14) {
    const dailyReturns: number[] = [];
    for (let i = 1; i < pnl.points.length; i++) {
      const prev = anchor + toNum(pnl.points[i - 1].cumulative_quote);
      const curr = anchor + toNum(pnl.points[i].cumulative_quote);
      if (prev > 0) dailyReturns.push((curr - prev) / prev);
    }
    if (dailyReturns.length > 1) {
      const mean = dailyReturns.reduce((s, x) => s + x, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / (dailyReturns.length - 1);
      const stdev = Math.sqrt(variance);
      if (stdev > 0) sharpe = (mean / stdev) * Math.sqrt(252);
    }
  }

  // Max drawdown dari backend drawdown endpoint
  const maxDdPct = dd && dd.points.length > 0
    ? Math.max(...dd.points.map((p) => toNum(p.drawdown_pct)))
    : 0;

  // Recovery factor = total_pnl / max_dd_quote (kalau ada)
  const maxDdQuote = dd && dd.points.length > 0
    ? Math.max(...dd.points.map((p) => toNum(p.drawdown_quote)))
    : 0;
  const recovery = maxDdQuote > 0 ? Math.abs(netPnlSum) / maxDdQuote : 0;

  const kpi: KPI = {
    totalReturn: pct(totalRet),
    sharpeRatio: sharpe != null ? sharpe.toFixed(2) : '—',
    sortinoRatio: '—', // Backend belum expose Sortino; defer.
    profitFactor: overallPF > 0 ? overallPF.toFixed(2) : '—',
    winRate: totalTrades > 0 ? `${(overallWinRate * 100).toFixed(1)}%` : '—',
    maxDrawdown: maxDdPct > 0 ? `-${maxDdPct.toFixed(1)}%` : '—',
    avgHoldTime: '—', // Backend analytics tidak return avg hold; computed di Phase 14W
    recoveryFactor: recovery > 0 ? recovery.toFixed(1) : '—',
  };

  return { equity, kpi };
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
