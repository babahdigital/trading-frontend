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
// sistem yang ditampilkan ke customer. STARTING_BALANCE_FALLBACK hanya
// dipakai untuk render local-fallback equity curve dari SignalAuditLog
// (no broker balance there). Backend path anchor ke REAL broker equity
// dari /api/forex/accounts — bukan halusinasi $10k.
const STARTING_BALANCE_FALLBACK = 10_000;
const CACHE_TTL_MS = 30 * 60 * 1000;

// Legacy cache (PortfolioCache replaces it — see GET handler at bottom).

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
interface BackendAccount {
  id: string;
  broker: string;
  login: string;
  currency: string;
  balance: string | number;
  equity: string | number;
  active: boolean;
}
interface BackendAccountList {
  data: BackendAccount[];
  count: number;
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

async function buildFromBackend(): Promise<{ equity: EquityPoint[]; kpi: KPI; currentEquity: number } | null> {
  // Backend exposes /api/forex/analytics/{pnl,performance,drawdown}
  // tenant-scoped via X-API-Token. Valid periods: 1d, 7d, 30d, 90d, ytd, all.
  // Plus /api/forex/accounts untuk dapat broker balance/equity REAL —
  // anchor equity curve ke nominal nyata (bukan halusinasi $10k).
  const [pnl, perf, dd, accts] = await Promise.all([
    fetchJson<{ period: string; points: BackendPnlPoint[] }>('stats', '/api/forex/analytics/pnl?period=ytd'),
    fetchJson<{ rows: BackendPerformanceRow[] }>('stats', '/api/forex/analytics/performance?period=ytd&group_by=day'),
    fetchJson<{ points: BackendDrawdownPoint[] }>('stats', '/api/forex/analytics/drawdown?period=ytd'),
    fetchJson<BackendAccountList>('stats', '/api/forex/accounts'),
  ]);
  if (!pnl || !pnl.points.length) {
    return null;
  }

  const firstCum = toNum(pnl.points[0].cumulative_quote);
  const lastCum = toNum(pnl.points[pnl.points.length - 1].cumulative_quote);

  // Real broker equity dari /api/forex/accounts — sum across all active
  // accounts master tenant. Kalau tenant cuma 1 MT5 account (typical),
  // ini langsung nominal akun-nya. Jika 0 accounts atau endpoint gagal
  // fallback ke STARTING_BALANCE_FALLBACK untuk tidak crash, tapi flag
  // jadi 'unknown_balance' supaya source jelas.
  const activeAccounts = (accts?.data ?? []).filter((a) => a.active);
  const currentEquity = activeAccounts.reduce((sum, a) => sum + toNum(a.equity), 0);
  const haveRealBalance = currentEquity > 0;

  // Anchor equity curve di period-start balance (current - total realised P&L
  // selama period). Asumsi: tidak ada unrealised di period boundary (typical
  // untuk closed scalper system). Kalau ada open position saat end-of-period,
  // ini bisa off oleh nominal unrealised — acceptable untuk display.
  const periodStartBalance = haveRealBalance
    ? currentEquity - lastCum
    : STARTING_BALANCE_FALLBACK - firstCum;
  const equity: EquityPoint[] = pnl.points.map((p) => ({
    time: p.bucket_ts.slice(0, 10),
    value: Number((periodStartBalance + toNum(p.cumulative_quote)).toFixed(2)),
  }));

  // Total return relative to period-start balance (real %).
  const totalRet = periodStartBalance > 0
    ? ((lastCum - firstCum) / periodStartBalance) * 100
    : 0;

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
      const prev = periodStartBalance + toNum(pnl.points[i - 1].cumulative_quote);
      const curr = periodStartBalance + toNum(pnl.points[i].cumulative_quote);
      if (prev > 0) dailyReturns.push((curr - prev) / prev);
    }
    if (dailyReturns.length > 1) {
      const mean = dailyReturns.reduce((s, x) => s + x, 0) / dailyReturns.length;
      const variance = dailyReturns.reduce((s, x) => s + (x - mean) ** 2, 0) / (dailyReturns.length - 1);
      const stdev = Math.sqrt(variance);
      if (stdev > 0) sharpe = (mean / stdev) * Math.sqrt(252);
    }
  }

  // Max drawdown — true % of REAL broker capital (period-start balance).
  // Backend `drawdown_pct` field nominally returns ratio terhadap
  // cumulative-realised-quote (start dekat 0) — value inflated ratusan
  // persen, salah representasi. Pakai drawdown_quote (nominal $) dibagi
  // periodStartBalance untuk true % of capital.
  const maxDdQuote = dd && dd.points.length > 0
    ? Math.max(...dd.points.map((p) => toNum(p.drawdown_quote)))
    : 0;
  const maxDdPct = periodStartBalance > 0
    ? (maxDdQuote / periodStartBalance) * 100
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

  return { equity, kpi, currentEquity };
}

async function buildFromLocal(): Promise<{ equity: EquityPoint[]; kpi: KPI; currentEquity: number }> {
  const series = await computePnlSeries('1y');
  const perf = await computePerformance('1y');

  const equity: EquityPoint[] = series.map((s) => ({
    time: s.date,
    value: Number((STARTING_BALANCE_FALLBACK + s.cumulative_pnl).toFixed(2)),
  }));

  const totalRet = equity.length > 0
    ? ((equity[equity.length - 1].value - STARTING_BALANCE_FALLBACK) / STARTING_BALANCE_FALLBACK) * 100
    : 0;

  let peak = STARTING_BALANCE_FALLBACK;
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

  return { equity, kpi, currentEquity: 0 };
}

interface PortfolioCache {
  ts: number;
  equity: EquityPoint[];
  kpi: KPI;
  currentEquity: number;
}
let portfolioCache: PortfolioCache | null = null;

export async function GET() {
  if (portfolioCache && Date.now() - portfolioCache.ts < CACHE_TTL_MS) {
    return NextResponse.json({
      source: 'cache',
      equity: portfolioCache.equity,
      kpi: portfolioCache.kpi,
      currentEquity: portfolioCache.currentEquity,
    });
  }

  // Try backend first
  const fromBackend = await buildFromBackend();
  if (fromBackend) {
    portfolioCache = { ts: Date.now(), ...fromBackend };
    return NextResponse.json({ source: 'backend', ...fromBackend });
  }

  // Fall back to local SignalAuditLog
  try {
    const fromLocal = await buildFromLocal();
    portfolioCache = { ts: Date.now(), ...fromLocal };
    return NextResponse.json({ source: 'local', ...fromLocal });
  } catch (err) {
    log.error(`Local performance build failed: ${err instanceof Error ? err.message : 'unknown'}`);
    // Last resort: empty payload — UI must handle "no data yet" gracefully
    return NextResponse.json({
      source: 'empty',
      equity: [],
      currentEquity: 0,
      kpi: {
        totalReturn: '—', sharpeRatio: '—', sortinoRatio: '—', profitFactor: '—',
        winRate: '—', maxDrawdown: '—', avgHoldTime: '—', recoveryFactor: '—',
      },
    });
  }
}

void prisma;
