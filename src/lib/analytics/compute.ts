/**
 * Analytics computation helpers — PnL, performance, drawdown from local
 * SignalAuditLog. Used as fallback when master backend is unreachable, and
 * for tier-restricted local-only metrics.
 *
 * Source of truth = SignalAuditLog table. Closed signals (WIN/LOSS/BREAKEVEN)
 * with profitUsd populated drive every derived metric.
 */

import { prisma } from '@/lib/db/prisma';

export type Period = '7d' | '30d' | '90d' | '1y' | 'all';

export interface PerformanceMetrics {
  total_trades: number;
  wins: number;
  losses: number;
  breakeven: number;
  pending: number;
  win_rate: number;
  total_pnl_usd: number;
  avg_win_usd: number;
  avg_loss_usd: number;
  profit_factor: number;
  best_trade_usd: number;
  worst_trade_usd: number;
}

export interface PnlBucket {
  date: string;
  realized_pnl: number;
  cumulative_pnl: number;
  trade_count: number;
}

export interface DrawdownSummary {
  peak_equity: number;
  trough_equity: number;
  max_drawdown_usd: number;
  max_drawdown_pct: number;
  current_drawdown_usd: number;
  recovered: boolean;
  series: { date: string; equity: number; drawdown_pct: number }[];
}

export function periodToDays(p: Period): number | null {
  if (p === 'all') return null;
  if (p === '7d') return 7;
  if (p === '30d') return 30;
  if (p === '90d') return 90;
  if (p === '1y') return 365;
  return 30;
}

export function periodCutoff(p: Period): Date | null {
  const days = periodToDays(p);
  if (days == null) return null;
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/** Round to 2 dp without losing sign on tiny negatives. */
function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

export async function computePerformance(period: Period, pair?: string): Promise<PerformanceMetrics> {
  const cutoff = periodCutoff(period);
  const where: Record<string, unknown> = {
    closedAt: cutoff ? { gte: cutoff } : { not: null },
  };
  if (pair) where.pair = pair.toUpperCase();

  const closed = await prisma.signalAuditLog.findMany({
    where,
    select: { outcome: true, profitUsd: true },
  });

  const wins = closed.filter((t) => t.outcome === 'WIN' && t.profitUsd != null);
  const losses = closed.filter((t) => t.outcome === 'LOSS' && t.profitUsd != null);
  const breakevens = closed.filter((t) => t.outcome === 'BREAKEVEN');

  const total_win = wins.reduce((sum, t) => sum + Number(t.profitUsd ?? 0), 0);
  const total_loss = losses.reduce((sum, t) => sum + Number(t.profitUsd ?? 0), 0);
  const all_pnl = closed.map((t) => Number(t.profitUsd ?? 0));
  const total_pnl = total_win + total_loss;

  const total_trades = wins.length + losses.length + breakevens.length;
  const win_rate = total_trades > 0 ? wins.length / total_trades : 0;
  const profit_factor = total_loss < 0 ? Math.abs(total_win / total_loss) : 0;

  return {
    total_trades,
    wins: wins.length,
    losses: losses.length,
    breakeven: breakevens.length,
    pending: 0,
    win_rate: Math.round(win_rate * 1000) / 1000,
    total_pnl_usd: r2(total_pnl),
    avg_win_usd: wins.length > 0 ? r2(total_win / wins.length) : 0,
    avg_loss_usd: losses.length > 0 ? r2(total_loss / losses.length) : 0,
    profit_factor: r2(profit_factor),
    best_trade_usd: all_pnl.length > 0 ? r2(Math.max(...all_pnl)) : 0,
    worst_trade_usd: all_pnl.length > 0 ? r2(Math.min(...all_pnl)) : 0,
  };
}

export async function computePnlSeries(period: Period, pair?: string): Promise<PnlBucket[]> {
  const cutoff = periodCutoff(period);
  const where: Record<string, unknown> = {
    closedAt: cutoff ? { gte: cutoff } : { not: null },
    profitUsd: { not: null },
  };
  if (pair) where.pair = pair.toUpperCase();

  const trades = await prisma.signalAuditLog.findMany({
    where,
    select: { closedAt: true, profitUsd: true },
    orderBy: { closedAt: 'asc' },
  });

  const buckets: Record<string, { realized_pnl: number; trade_count: number }> = {};
  for (const t of trades) {
    if (!t.closedAt) continue;
    const date = t.closedAt.toISOString().slice(0, 10);
    buckets[date] ??= { realized_pnl: 0, trade_count: 0 };
    buckets[date].realized_pnl += Number(t.profitUsd ?? 0);
    buckets[date].trade_count += 1;
  }

  const sorted = Object.entries(buckets).sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  return sorted.map(([date, b]) => {
    cumulative += b.realized_pnl;
    return {
      date,
      realized_pnl: r2(b.realized_pnl),
      cumulative_pnl: r2(cumulative),
      trade_count: b.trade_count,
    };
  });
}

export async function computeDrawdown(period: Period, pair?: string): Promise<DrawdownSummary> {
  const series = await computePnlSeries(period, pair);
  if (series.length === 0) {
    return {
      peak_equity: 0,
      trough_equity: 0,
      max_drawdown_usd: 0,
      max_drawdown_pct: 0,
      current_drawdown_usd: 0,
      recovered: true,
      series: [],
    };
  }

  let peak = -Infinity;
  let maxDdAbs = 0;
  let maxDdPct = 0;
  let trough = Infinity;
  const out: DrawdownSummary['series'] = [];

  for (const b of series) {
    const eq = b.cumulative_pnl;
    if (eq > peak) peak = eq;
    const ddAbs = peak - eq;
    const ddPct = peak !== 0 ? (ddAbs / Math.abs(peak)) * 100 : 0;
    if (ddAbs > maxDdAbs) maxDdAbs = ddAbs;
    if (ddPct > maxDdPct) maxDdPct = ddPct;
    if (eq < trough) trough = eq;
    out.push({ date: b.date, equity: r2(eq), drawdown_pct: r2(ddPct) });
  }

  const lastEq = series[series.length - 1].cumulative_pnl;
  const currentDd = peak - lastEq;

  return {
    peak_equity: r2(peak === -Infinity ? 0 : peak),
    trough_equity: r2(trough === Infinity ? 0 : trough),
    max_drawdown_usd: r2(maxDdAbs),
    max_drawdown_pct: r2(maxDdPct),
    current_drawdown_usd: r2(currentDd),
    recovered: currentDd < 0.01,
    series: out,
  };
}
