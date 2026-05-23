'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/admin/empty-state';
import { tradeOutcomeBadge } from '@/lib/admin/badges';

export interface Position {
  ticket: string;
  symbol: string;
  direction: string;
  lot: number;
  entry_price: number;
  current_price: number;
  pnl_usd: number;
  pnl_pips: number;
  duration_seconds: number;
  sl: number;
  tp: number;
  setup: string;
  confidence: number;
  risk_pct: number;
}

// Strategy id to tone class mapping
const SETUP_TONE_CLASS: Record<string, string> = {
  smc: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  qm_perfect_pure: 'bg-sky-500/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  qm_perfect_ao: 'bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  qm_perfect_adx: 'bg-violet-500/15 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  qm_perfect_full: 'bg-fuchsia-500/15 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  qm_perfect_adx_h4: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  swing: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  smc_swing: 'bg-pink-500/15 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300',
  pivot_mean_reversion: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  wyckoff: 'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
  momentum: 'bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  oil_gas: 'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  astronacci: 'bg-cyan-500/15 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '-';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export interface PositionsTableProps {
  positions: Position[];
  error?: string | null;
}

export function PositionsTable({ positions, error }: PositionsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-medium">Live Positions</CardTitle>
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Auto-refresh 5d
        </span>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div role="alert" className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded px-3 py-2 mx-4 mt-3">
            {error}
          </div>
        )}
        {positions.length === 0 ? (
          <div className="p-6">
            <EmptyState
              variant="inline"
              icon={TrendingUp}
              title="Tidak ada posisi terbuka"
              description="Posisi terbuka akan tampil di sini saat sistem mengeksekusi trade."
              size="sm"
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium text-muted-foreground">Pair</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Dir</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Lot</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Entry</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Current</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">PnL $</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">PnL pts</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Duration</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Setup</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Conf</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Risk%</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((pos) => {
                  const outcomeMeta = tradeOutcomeBadge(pos.direction);
                  return (
                    <tr key={pos.ticket} className={cn('border-b transition-colors', pos.pnl_usd >= 0 ? 'hover:bg-emerald-500/5' : 'hover:bg-rose-500/5')}>
                      <td className="p-3 font-mono font-semibold">{pos.symbol}</td>
                      <td className="p-3">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                          pos.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                        )}>
                          {pos.direction}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{pos.lot}</td>
                      <td className="p-3 text-right font-mono">{pos.entry_price}</td>
                      <td className="p-3 text-right font-mono">{pos.current_price}</td>
                      <td className={cn('p-3 text-right font-mono font-semibold', pos.pnl_usd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {pos.pnl_usd >= 0 ? '+' : ''}${pos.pnl_usd?.toFixed(2)}
                      </td>
                      <td className={cn('p-3 text-right font-mono', pos.pnl_pips >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                        {pos.pnl_pips >= 0 ? '+' : ''}{pos.pnl_pips}
                      </td>
                      <td className="p-3 text-right font-mono text-xs">{formatDuration(pos.duration_seconds || 0)}</td>
                      <td className="p-3">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-medium', SETUP_TONE_CLASS[pos.setup] || 'bg-slate-500/15 text-slate-700 dark:text-slate-300')}>
                          {pos.setup}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono">{pos.confidence?.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono">{pos.risk_pct?.toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
