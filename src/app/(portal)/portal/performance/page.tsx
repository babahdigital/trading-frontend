'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { StrategyDonut } from '@/components/charts/strategy-donut';
import { WinRateBar } from '@/components/charts/win-rate-bar';
import { HourlyHeatmap } from '@/components/charts/hourly-heatmap';
import { MonthlyCalendar } from '@/components/charts/monthly-calendar';

interface PairBreakdown {
  pair: string;
  trades: number;
  pnl: number;
  win_rate: number;
}

interface SetupBreakdown {
  setup: string;
  trades: number;
  pnl: number;
  win_rate: number;
}

interface PerformanceData {
  win_rate?: number;
  profit_factor?: number;
  total_pnl?: number;
  max_drawdown?: number;
  avg_win?: number;
  avg_loss?: number;
  best_day?: number;
  worst_day?: number;
  pair_breakdown?: PairBreakdown[];
  setup_breakdown?: SetupBreakdown[];
  hourly_pnl?: { hour: number; day: number; pnl: number; trades: number }[];
  daily_pnl?: { date: string; pnl: number; trades: number; winRate: number }[];
  close_reasons?: { reason: string; trades: number; pnl: number }[];
}

const STRATEGY_COLORS = ['#22c55e', '#3b82f6', '#8b5cf6', '#f97316', '#06b6d4', '#ec4899'];

// Generic labels for client
function genericSetup(setup: string): string {
  const map: Record<string, string> = {
    smc: 'Strategi A', wyckoff: 'Strategi B', momentum: 'Strategi C',
    oil_gas: 'Strategi D', astronacci: 'Strategi E', swing: 'Strategi F',
  };
  return map[setup.toLowerCase()] || setup;
}

function getAuthHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('access_token')}`,
  };
}

export default function PerformancePage() {
  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const fetchPerformance = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/performance?days=${d}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch performance');
      setData(await res.json());
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPerformance(days); }, [days, fetchPerformance]);

  function fmt(val: number | undefined, prefix = '', suffix = '') {
    if (val === undefined || val === null) return '-';
    return `${prefix}${val.toFixed(2)}${suffix}`;
  }

  const now = new Date();

  // Build chart data from setup breakdown
  const donutData = data?.setup_breakdown?.map((s, i) => ({
    name: genericSetup(s.setup),
    value: s.trades,
    color: STRATEGY_COLORS[i % STRATEGY_COLORS.length],
  })) || [];

  const winRateData = data?.setup_breakdown?.map((s) => ({
    name: genericSetup(s.setup),
    winRate: Math.round(s.win_rate * 10) / 10,
  })) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analisa Performa</h1>
        <div className="flex items-center gap-1">
          {[30, 90].map((d) => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d}D
            </Button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {loading ? (
        <p className="text-muted-foreground text-sm">Loading...</p>
      ) : (
        <>
          {/* ROW 1: 6 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Win Rate</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono">{fmt(data?.win_rate, '', '%')}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Profit Factor</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono">{fmt(data?.profit_factor)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg Win</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono text-green-400">{fmt(data?.avg_win, '+$')}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Avg Loss</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono text-red-400">{fmt(data?.avg_loss, '-$')}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Best Day</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono text-green-400">{fmt(data?.best_day, '+$')}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Worst Day</CardTitle></CardHeader>
              <CardContent><p className="text-xl font-bold font-mono text-red-400">{fmt(data?.worst_day, '-$')}</p></CardContent>
            </Card>
          </div>

          {/* ROW 2: Strategy Donut + Win Rate Bar */}
          {donutData.length > 0 && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Distribusi Strategi</CardTitle></CardHeader>
                <CardContent>
                  <StrategyDonut
                    data={donutData}
                    centerLabel={String(data?.setup_breakdown?.reduce((s, x) => s + x.trades, 0) || '')}
                    height={280}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm font-medium">Win Rate per Strategi</CardTitle></CardHeader>
                <CardContent>
                  <WinRateBar data={winRateData} height={280} />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ROW 3: Hourly Heatmap */}
          {data?.hourly_pnl && data.hourly_pnl.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">PnL per Jam (Heatmap)</CardTitle></CardHeader>
              <CardContent>
                <HourlyHeatmap data={data.hourly_pnl} />
              </CardContent>
            </Card>
          )}

          {/* ROW 4: Monthly Calendar */}
          {data?.daily_pnl && data.daily_pnl.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Kalender PnL Bulanan</CardTitle></CardHeader>
              <CardContent>
                <MonthlyCalendar
                  data={data.daily_pnl}
                  month={now.getMonth() + 1}
                  year={now.getFullYear()}
                />
              </CardContent>
            </Card>
          )}

          {/* ROW 5: Close Reason Breakdown */}
          {data?.close_reasons && data.close_reasons.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Alasan Penutupan</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.close_reasons.map((cr, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn('w-3 h-3 rounded-full',
                          cr.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'
                        )} />
                        <span className="text-sm">{cr.reason}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-mono">{cr.trades} trades</span>
                        <span className={cn('ml-3 text-sm font-mono', cr.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {cr.pnl >= 0 ? '+' : ''}${cr.pnl.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pair Breakdown Table */}
          {data?.pair_breakdown && data.pair_breakdown.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm font-medium">Performa per Pair</CardTitle></CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Pair</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Trades</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">Win Rate</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right">P&L</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pair_breakdown.map((p, i) => (
                        <tr key={i} className="border-b border-border/50 last:border-0">
                          <td className="py-3 font-mono font-medium">{p.pair}</td>
                          <td className="py-3 text-right font-mono">{p.trades}</td>
                          <td className="py-3 text-right font-mono">{p.win_rate?.toFixed(1)}%</td>
                          <td className={cn('py-3 text-right font-mono font-medium', p.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                            {p.pnl >= 0 ? '+' : ''}${p.pnl.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
