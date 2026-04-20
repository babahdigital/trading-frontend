'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { Activity, ArrowRight, Clock, Shield, Wifi } from 'lucide-react';

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
  uptime_seconds?: number;
  mt5_connected?: boolean;
  last_sync?: string;
  code_version?: string;
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

export default function MyVpsPage() {
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [weeklyPnl, setWeeklyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [equityPeriod, setEquityPeriod] = useState('30D');

  // Fetch status (polling)
  useEffect(() => {
    let active = true;
    async function fetchStatus() {
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error('Gagal memuat status VPS');
        const data = await res.json();
        if (active) { setStatus(data); setError(''); }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : 'Koneksi error');
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

  function botStatusLabel(s?: string) {
    if (!s) return { label: 'Tidak Diketahui', color: 'text-muted-foreground', bg: 'bg-muted' };
    const lower = s.toLowerCase();
    if (lower === 'active' || lower === 'running') return { label: 'Aktif', color: 'text-green-400', bg: 'bg-green-500/20' };
    if (lower === 'error') return { label: 'Error', color: 'text-red-400', bg: 'bg-red-500/20' };
    if (lower === 'stopped') return { label: 'Berhenti', color: 'text-orange-400', bg: 'bg-orange-500/20' };
    return { label: s, color: 'text-yellow-400', bg: 'bg-yellow-500/20' };
  }

  function formatPnl(val?: number) {
    if (val === undefined || val === null) return '-';
    return `${val >= 0 ? '+' : ''}$${val.toFixed(2)}`;
  }

  function licenseInfo() {
    if (!status?.license_expiry) return null;
    const diff = new Date(status.license_expiry).getTime() - Date.now();
    if (diff <= 0) return { text: 'Expired', urgent: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 7) return { text: `${days} hari lagi`, urgent: true };
    return { text: `${days} hari tersisa`, urgent: false };
  }

  function formatUptime(seconds?: number) {
    if (!seconds) return '-';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    if (d > 0) return `${d}h ${h}j`;
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}j ${m}m`;
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">VPS Saya</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonChart />
        <SkeletonTable rows={5} />
      </div>
    );
  }

  const botSt = botStatusLabel(status?.bot_status);
  const license = licenseInfo();
  const positions = status?.open_positions || [];
  const aiStates = status?.ai_state_by_pair ? Object.entries(status.ai_state_by_pair) : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">VPS Saya</h1>
          <p className="text-sm text-muted-foreground">Ringkasan status VPS dan trading bot Anda</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', botSt.bg, botSt.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full', botSt.color === 'text-green-400' ? 'bg-green-400' : botSt.color === 'text-red-400' ? 'bg-red-400' : 'bg-yellow-400')} />
            Bot: {botSt.label}
          </span>
          {license && (
            <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
              license.urgent ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
            )}>
              <Shield className="w-3 h-3 mr-1" />
              Lisensi: {license.text}
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                {status.equity_change_pct >= 0 ? '▲ +' : '▼ '}{status.equity_change_pct.toFixed(1)}%
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">PnL Hari Ini</CardTitle>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">Posisi Terbuka</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{status?.open_trades ?? positions.length}</p>
            <p className={cn('text-xs font-mono',
              (status?.floating_pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'
            )}>
              Floating: {formatPnl(status?.floating_pnl)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pair Aktif</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold font-mono">{status?.active_pairs ?? aiStates.length}</p>
            <p className="text-xs text-muted-foreground">dari 14 pair</p>
          </CardContent>
        </Card>
      </div>

      {/* System Info Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Uptime: {formatUptime(status?.uptime_seconds)}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wifi className={cn('w-4 h-4', status?.mt5_connected ? 'text-green-400' : 'text-red-400')} />
          <span>MT5: {status?.mt5_connected ? 'Terhubung' : 'Terputus'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>Versi: {status?.code_version || '-'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Sync: {status?.last_sync ? new Date(status.last_sync).toLocaleDateString('id-ID') : '-'}</span>
        </div>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Kurva Equity</CardTitle>
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
              Data equity akan muncul saat terhubung ke trading backend
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positions + Bot Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Posisi Terbuka</CardTitle>
            <Link href="/portal/my-vps/trades" className="text-xs text-primary hover:underline flex items-center gap-1">
              Semua Trade <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">Tidak ada posisi terbuka</p>
            ) : (
              <div className="space-y-2">
                {positions.slice(0, 5).map((pos, i) => (
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
                {positions.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    +{positions.length - 5} posisi lainnya
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

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

      {/* Daily PnL */}
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
