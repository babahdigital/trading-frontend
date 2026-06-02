'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { EquityCurve } from '@/components/charts/equity-curve';
import { PnlBarChart } from '@/components/charts/pnl-bar-chart';
import { SkeletonCard, SkeletonChart, SkeletonTable } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { Activity, ArrowRight, ArrowUp, ArrowDown, Clock, Shield, Wifi } from 'lucide-react';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

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
  const t = useTranslations('portal.vps.dashboard');
  const locale = useLocale() as Locale;
  const { getAuthHeaders } = useAuth();
  const [status, setStatus] = useState<StatusData | null>(null);
  const [equityData, setEquityData] = useState<{ time: string; value: number }[]>([]);
  const [weeklyPnl, setWeeklyPnl] = useState<{ date: string; pnl: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [equityPeriod, setEquityPeriod] = useState('30D');

  // Fetch status (polling, pauses when tab hidden)
  useEffect(() => {
    let active = true;
    let interval: ReturnType<typeof setInterval>;
    async function fetchStatus() {
      if (document.hidden) return;
      try {
        const res = await fetch('/api/client/status', { headers: getAuthHeaders() });
        if (res.status === 401) { window.location.href = '/login'; return; }
        if (!res.ok) throw new Error(t('load_failed'));
        const data = await res.json();
        if (active) { setStatus(data); setError(''); }
      } catch (err: unknown) {
        if (active) setError(err instanceof Error ? err.message : t('load_failed'));
      } finally {
        if (active) setLoading(false);
      }
    }
    fetchStatus();
    interval = setInterval(fetchStatus, 5000);

    const onVisChange = () => {
      if (!document.hidden) fetchStatus();
    };
    document.addEventListener('visibilitychange', onVisChange);
    return () => { active = false; clearInterval(interval); document.removeEventListener('visibilitychange', onVisChange); };
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
    if (!s) return { label: t('bot_status_unknown'), color: 'text-muted-foreground', bg: 'bg-muted', dot: 'bg-muted-foreground/40' };
    const lower = s.toLowerCase();
    if (lower === 'active' || lower === 'running') return { label: t('bot_status_active'), color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-500/15', dot: 'bg-emerald-500' };
    if (lower === 'error') return { label: t('bot_status_error'), color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-500/15', dot: 'bg-rose-500' };
    if (lower === 'stopped') return { label: t('bot_status_stopped'), color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-500/15', dot: 'bg-orange-500' };
    return { label: s, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-500/15', dot: 'bg-amber-500' };
  }

  function formatPnl(val?: number) {
    if (val === undefined || val === null) return '-';
    return `${val >= 0 ? '+' : ''}${formatCurrency(Math.abs(val), 'USD', locale)}`;
  }

  function licenseInfo() {
    if (!status?.license_expiry) return null;
    // Date.now() di-evaluate per render — di-refresh otomatis lewat polling parent state.
    // eslint-disable-next-line react-hooks/purity
    const diff = new Date(status.license_expiry).getTime() - Date.now();
    if (diff <= 0) return { text: t('license_expired'), urgent: true };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days <= 7) return { text: t('license_days_left', { days }), urgent: true };
    return { text: t('license_days_remaining', { days }), urgent: false };
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
      <div className="portal-page-stack">
        <PageHeader title={t('heading')} description={t('tagline')} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
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
    <div className="portal-page-stack">
      <PageHeader
        title={t('heading')}
        description={t('tagline')}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium', botSt.bg, botSt.color)}>
              <span className={cn('w-1.5 h-1.5 rounded-full', botSt.dot)} />
              {t('bot_label', { status: botSt.label })}
            </span>
            {license && (
              <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
                license.urgent ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
              )}>
                <Shield className="w-3 h-3 mr-1" />
                {t('license_label', { value: license.text })}
              </span>
            )}
          </div>
        }
      />

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
      )}

      {/* KPI Cards */}
      <StatCardGrid columns={4}>
        <StatCard
          label={t('kpi_equity')}
          value={status?.equity !== undefined ? formatCurrency(status.equity, 'USD', locale) : '-'}
          sub={status?.equity_change_pct !== undefined ? (
            <span className={cn(status.equity_change_pct >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {status.equity_change_pct >= 0 ? <ArrowUp className="inline h-3 w-3 mr-0.5" strokeWidth={2.5} /> : <ArrowDown className="inline h-3 w-3 mr-0.5" strokeWidth={2.5} />}{formatPercent(Math.abs(status.equity_change_pct), locale, { decimals: 1 })}
            </span>
          ) : undefined}
        />
        <StatCard
          label={t('kpi_today_pnl')}
          value={
            <span className={cn(
              status?.today_pnl !== undefined ? (status.today_pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : ''
            )}>{formatPnl(status?.today_pnl)}</span>
          }
          sub={(status?.wins_today !== undefined || status?.losses_today !== undefined) ?
            t('win_loss_short', { wins: status?.wins_today ?? 0, losses: status?.losses_today ?? 0 }) : undefined}
        />
        <StatCard
          label={t('kpi_open_positions')}
          value={String(status?.open_trades ?? positions.length)}
          sub={(
            <span className={cn('font-mono', (status?.floating_pnl || 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {t('floating_label', { value: formatPnl(status?.floating_pnl) })}
            </span>
          )}
        />
        <StatCard
          label={t('kpi_active_pairs')}
          value={String(status?.active_pairs ?? aiStates.length)}
          sub={t('from_total_pairs')}
        />
      </StatCardGrid>

      {/* System Info Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{t('uptime_label', { value: formatUptime(status?.uptime_seconds) })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Wifi className={cn('w-4 h-4', status?.mt5_connected ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')} />
          <span>{t('mt5_label', { value: status?.mt5_connected ? t('mt5_connected') : t('mt5_disconnected') })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Activity className="w-4 h-4" />
          <span>{t('version_label', { value: status?.code_version || '-' })}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>{t('sync_label', { value: status?.last_sync ? formatDate(status.last_sync, locale) : '-' })}</span>
        </div>
      </div>

      {/* Equity Curve */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('equity_chart_title')}</CardTitle>
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
              {t('equity_empty')}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Positions + Bot Activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">{t('open_positions_title')}</CardTitle>
            <Link href="/portal/my-vps/trades" className="text-xs text-primary hover:underline flex items-center gap-1">
              {t('all_trades_link')} <ArrowRight className="w-3 h-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {positions.length === 0 ? (
              <EmptyState variant="inline" title={t('no_open_positions')} size="sm" />
            ) : (
              <div className="space-y-2">
                {positions.slice(0, 5).map((pos, i) => (
                  <div key={i} className={cn('flex items-center justify-between p-3 rounded-lg border',
                    pos.pnl_usd >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'
                  )}>
                    <div>
                      <span className="font-mono font-semibold text-sm">{pos.symbol}</span>
                      <span className={cn('ml-2 text-xs px-1.5 py-0.5 rounded',
                        pos.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      )}>{pos.direction}</span>
                    </div>
                    <div className="text-right">
                      <span className={cn('font-mono font-semibold text-sm',
                        pos.pnl_usd >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      )}>
                        {formatPnl(pos.pnl_usd)}
                      </span>
                      <div className="text-xs text-muted-foreground">
                        {Math.floor((pos.duration_seconds || 0) / 60)}m
                      </div>
                    </div>
                  </div>
                ))}
                {positions.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    {t('more_positions', { count: positions.length - 5 })}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('bot_activity_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            {aiStates.length === 0 ? (
              <EmptyState variant="inline" title={t('no_activity')} size="sm" />
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {aiStates.map(([pair, state]) => (
                  <div key={pair} className="flex items-center gap-3 p-2 text-sm">
                    <span className="w-2 h-2 rounded-full bg-sky-500 flex-shrink-0" />
                    <div>
                      <span className="font-mono font-semibold">{pair}</span>
                      <span className="text-muted-foreground ml-2">
                        {state.runtime_status_label || t('default_runtime_status')}
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
          <CardTitle className="text-sm font-medium">{t('daily_pnl_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {weeklyPnl.length > 0 ? (
            <PnlBarChart data={weeklyPnl} height={160} />
          ) : (
            <div className="flex items-center justify-center h-[160px] text-muted-foreground text-sm">
              {t('daily_pnl_empty')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
