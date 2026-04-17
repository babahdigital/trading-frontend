'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';

interface StatusData {
  bot_status?: string;
  today_pnl?: number;
  open_trades?: number;
  equity?: number;
  license_status?: string;
  license_expiry?: string;
  wins_today?: number;
  losses_today?: number;
  active_pairs?: number;
  equity_change_pct?: number;
  floating_pnl?: number;
  ai_state_by_pair?: Record<string, {
    runtime_status_label?: string;
    pair?: string;
    updated_seconds_ago?: number;
  }>;
  open_positions?: {
    symbol: string;
    direction: string;
    pnl_usd: number;
    duration_seconds: number;
    status?: string;
  }[];
}

export default function PortalDashboard() {
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [weeklyPnl, setWeeklyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [equityPeriod, setEquityPeriod] = useState('30D');

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      setUserName(user.name || user.email || '');
    } catch { /* empty */ }
  }, []);

  // Fetch status (polling)
  useEffect(() => {
    let active = true;
    async function fetchStatus() {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Failed to fetch status');
        const data = await res.json();
        if (active) { setStatus(data); setError(''); }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Connection error');
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => { active = false; clearInterval(interval); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch equity data
  useEffect(() => {
    async function fetchEquity() {
      try {
        const days = equityPeriod === '7D' ? 7 : equityPeriod === '90D' ? 90 : 30;
        const res = await fetch(`/api/client/equity?days=${days}`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.snapshots)) {
            setEquityData(data.snapshots.map((s: { timestamp: string; equity: number }) => ({
              time: s.timestamp?.split('T')[0] || s.timestamp,
              value: s.equity,
            })));
          }
        }
      } catch { /* handled */ }
    }
    fetchEquity();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [equityPeriod]);

  // Fetch weekly PnL
  useEffect(() => {
    async function fetchWeeklyPnl() {
      try {
        const res = await fetch('/api/client/reports', { headers: getAuthHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.daily_pnl && Array.isArray(data.daily_pnl)) {
            setWeeklyPnl(data.daily_pnl.slice(-7));
          }
        }
      } catch { /* handled */ }
    }
    fetchWeeklyPnl();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function botStatusColor(s?: string) {
    if (!s) return 'text-muted-foreground';
    const lower = s.toLowerCase();
    if (lower === 'active' || lower === 'running') return 'text-green-400';
    if (lower === 'error') return 'text-red-400';
    return 'text-yellow-400';
  }

  function formatPnl(val?: number) {
    if (val === undefined || val === null) return '-';
    return `${val >= 0 ? '+' : ''}$${val.toFixed(2)}`;
  }

  function licenseCountdown() {
    if (!status?.license_expiry) return null;
    const diff = new Date(status.license_expiry).getTime() - Date.now();
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} hari tersisa`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const positions = status?.open_positions || [];
  const aiStates = status?.ai_state_by_pair ? Object.entries(status.ai_state_by_pair) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          {userName && <p className="text-sm text-muted-foreground">Selamat datang, {userName}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
            status?.license_status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
          )}>
            License: {status?.license_status === 'active' ? 'Active' : status?.license_status || 'Unknown'}
          </span>
          {licenseCountdown() && <span className="text-xs text-muted-foreground">{licenseCountdown()}</span>}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* ROW 1: KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Bot Status</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-bold capitalize', botStatusColor(status?.bot_status))}>
              {status?.bot_status || '-'}
            </p>
            <p className="text-xs text-muted-foreground">{status?.active_pairs || 14} pairs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Equity</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">
              {status?.equity !== undefined ? `$${status.equity.toLocaleString()}` : '-'}
            </p>
            {status?.equity_change_pct !== undefined && (
              <p className={cn('text-xs', status.equity_change_pct >= 0 ? 'text-green-400' : 'text-red-400')}>
                ▲ {status.equity_change_pct >= 0 ? '+' : ''}{status.equity_change_pct.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-bold font-mono',
              status?.today_pnl !== undefined ? (status.today_pnl >= 0 ? 'text-green-400' : 'text-red-400') : ''
            )}>
              {formatPnl(status?.today_pnl)}
            </p>
            {(status?.wins_today !== undefined || status?.losses_today !== undefined) && (
              <p className="text-xs text-muted-foreground">
                {status?.wins_today ?? 0}W / {status?.losses_today ?? 0}L
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Open Trades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{status?.open_trades ?? positions.length}</p>
            <p className={cn('text-xs font-mono',
              (status?.floating_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              {formatPnl(status?.floating_pnl)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ROW 2: Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          {equityData.length > 0 ? (
            <EquityCurve
              data={equityData}
              height={320}
              periods={['7D', '30D', '90D']}
              activePeriod={equityPeriod}
              onPeriodChange={setEquityPeriod}
            />
          ) : (
            <div className="flex items-center justify-center h-[240px] sm:h-[280px] md:h-[320px] text-muted-foreground text-sm">
              Equity data will appear when connected to trading backend
            </div>
          )}
        </CardContent>
      </Card>

      {/* ROW 3: Open Positions + Bot Activity Feed */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Positions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Posisi Terbuka</CardTitle>
            <span className="text-xs text-muted-foreground">Polling 3s</span>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Tidak ada posisi terbuka</p>
            ) : (
              <div className="space-y-2">
                {positions.map((pos, i) => (
                  <div key={i} className={cn('flex items-center justify-between p-3 rounded-lg border',
                    pos.pnl_usd >= 0 ? 'border-green-500/20' : 'border-red-500/20'
                  )}>
                    <div>
                      <span className="font-mono font-semibold text-sm">{pos.symbol}</span>
                      <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded',
                        pos.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>{pos.direction}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn('font-mono font-semibold text-sm',
                        pos.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'
                      )}>
                        {pos.pnl_usd >= 0 ? '+' : ''}${pos.pnl_usd?.toFixed(2)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {Math.floor((pos.duration_seconds || 0) / 60)}m
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bot Activity Feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Aktivitas Bot</CardTitle>
          </CardHeader>
          <CardContent>
            {aiStates.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Tidak ada data aktivitas</p>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {aiStates.map(([pair, state]) => (
                  <div key={pair} className="flex items-center gap-3 p-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                    <div>
                      <span className="font-mono font-semibold">{pair}</span>
                      <span className="text-muted-foreground ml-2">
                        {state.runtime_status_label || 'Memantau pasar'}
                      </span>
                    </div>
                    {state.updated_seconds_ago !== undefined && (
                      <span className="text-xs text-muted-foreground ml-auto">{state.updated_seconds_ago}s</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ROW 4: Daily PnL Mini Bar (7 days) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">PnL Harian (7 Hari Terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyPnl.length > 0 ? (
            <PnlBarChart data={weeklyPnl} height={160} />
          ) : (
            <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
              Data PnL harian akan muncul saat terhubung
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
