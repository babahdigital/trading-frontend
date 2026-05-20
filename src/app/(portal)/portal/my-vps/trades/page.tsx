'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CumulativePnl } from '@/components/charts/cumulative-pnl';
import { useAuth } from '@/lib/auth/auth-context';
import { csvEscape } from '@/lib/csv';
import { ArrowLeft, Download, History as HistoryIcon } from 'lucide-react';
import { strategyDisplayName, isStrategyObfuscationEnabled } from '@/lib/trading/strategy-names';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { StatCard, StatCardGrid } from '@/components/admin/stat-card';
import { formatCurrency, formatDate, formatPercent } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';

interface Trade {
  date: string;
  pair: string;
  type: string;
  pnl: number;
  duration?: string;
  setup?: string;
  close_reason?: string;
}

function genericSetup(setup?: string): string {
  return strategyDisplayName(setup, isStrategyObfuscationEnabled());
}

export default function MyVpsTradesPage() {
  const t = useTranslations('portal.vps.trades');
  const tShared = useTranslations('portal.shared');
  const locale = useLocale() as Locale;
  const { getAuthHeaders } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [pairFilter, setPairFilter] = useState('');

  function closeReasonBadge(reason?: string) {
    if (!reason) return null;
    const r = reason.toLowerCase();
    if (r.includes('take_profit') || r.includes('tp')) return { label: t('reason_tp'), cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
    if (r.includes('stop_loss') || r.includes('sl')) return { label: t('reason_sl'), cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
    if (r.includes('manual')) return { label: t('reason_manual'), cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' };
    if (r.includes('max_hold')) return { label: t('reason_max_hold'), cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
    return { label: reason, cls: 'bg-slate-500/15 text-slate-700 dark:text-slate-300' };
  }

  const fetchTrades = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/trades?days=${d}`, { headers: getAuthHeaders() });
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error(t('load_failed'));
      const data = await res.json();
      setTrades(Array.isArray(data) ? data : data.trades || []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tShared('connection_error'));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // fetchTrades drives setState — intentional fetch on mount + refetch saat `days` berubah.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchTrades(days); }, [days, fetchTrades]);

  const filtered = pairFilter
    ? trades.filter((tr) => tr.pair?.toLowerCase().includes(pairFilter.toLowerCase()))
    : trades;

  const totalPnl = filtered.reduce((sum, tr) => sum + (tr.pnl || 0), 0);
  const wins = filtered.filter((tr) => tr.pnl > 0).length;
  const losses = filtered.filter((tr) => tr.pnl < 0).length;
  const winRate = filtered.length > 0 ? ((wins / filtered.length) * 100).toFixed(1) : '0';

  // Build cumulative PnL data — pure reduce (immutable-safe)
  const cumulativeData = filtered.reduce<Array<{ trade: number; pnl: number }>>((acc, tr, i) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].pnl : 0;
    acc.push({ trade: i + 1, pnl: Math.round((prev + (tr.pnl || 0)) * 100) / 100 });
    return acc;
  }, []);

  function exportCsv() {
    if (filtered.length === 0) return;
    const headers = [
      t('csv_header_date'),
      t('csv_header_pair'),
      t('csv_header_direction'),
      t('csv_header_result'),
      t('csv_header_duration'),
      t('csv_header_strategy'),
      t('csv_header_close_reason'),
    ];
    const rows = filtered.map((tr) => [
      csvEscape(tr.date), csvEscape(tr.pair), csvEscape(tr.type), csvEscape(tr.pnl),
      csvEscape(tr.duration || ''), csvEscape(genericSetup(tr.setup)), csvEscape(tr.close_reason || ''),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = t('csv_filename', { days });
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="portal-page-stack">
      <PageHeader
        title={t('heading')}
        description={t('tagline')}
        eyebrow={
          <Link href="/portal/my-vps" className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
            <ArrowLeft className="w-3 h-3" /> {t('back')}
          </Link>
        }
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="w-4 h-4 mr-1" /> {t('export_csv')}
          </Button>
        }
      />

      {/* Summary Cards */}
      <StatCardGrid columns={4}>
        <StatCard label={t('kpi_total')} value={String(filtered.length)} />
        <StatCard
          label={t('kpi_total_pnl')}
          value={
            <span className={cn(totalPnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {totalPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalPnl), 'USD', locale)}
            </span>
          }
        />
        <StatCard
          label={t('kpi_winloss')}
          value={
            <>
              <span className="text-emerald-600 dark:text-emerald-400">{wins}</span>
              <span className="text-muted-foreground mx-1">/</span>
              <span className="text-rose-600 dark:text-rose-400">{losses}</span>
            </>
          }
        />
        <StatCard label={t('kpi_winrate')} value={formatPercent(Number(winRate), locale, { decimals: 1 })} />
      </StatCardGrid>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {t('filter_days', { days: d })}
            </Button>
          ))}
        </div>
        <Input
          placeholder={t('search_pair_placeholder')}
          value={pairFilter}
          onChange={(e) => setPairFilter(e.target.value)}
          className="w-48 bg-background"
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">{error}</div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block">
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('list_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded bg-muted animate-pulse" />)}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState variant="inline" icon={HistoryIcon} title={t('empty')} size="sm" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">{t('col_date')}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{t('col_pair')}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{t('col_direction')}</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">{t('col_result')}</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">{t('col_duration')}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{t('col_strategy')}</th>
                    <th className="pb-3 font-medium text-muted-foreground">{t('col_close_reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tr, i) => {
                    const badge = closeReasonBadge(tr.close_reason);
                    return (
                      <tr key={i} className={cn('border-b border-border/50 last:border-0',
                        tr.pnl >= 0 ? 'bg-emerald-500/[0.03]' : 'bg-rose-500/[0.03]'
                      )}>
                        <td className="py-3 text-muted-foreground text-xs">{formatDate(tr.date, locale)}</td>
                        <td className="py-3 font-mono font-medium">{tr.pair}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                            tr.type?.toLowerCase() === 'buy' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          )}>{tr.type}</span>
                        </td>
                        <td className={cn('py-3 text-right font-mono font-medium', tr.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                          {tr.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(tr.pnl), 'USD', locale)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{tr.duration || '-'}</td>
                        <td className="py-3 text-muted-foreground text-xs">{genericSetup(tr.setup)}</td>
                        <td className="py-3">
                          {badge && <span className={cn('px-2 py-0.5 rounded text-xs', badge.cls)}>{badge.label}</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 rounded bg-muted animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={HistoryIcon} title={t('empty')} size="sm" />
        ) : (
          filtered.map((tr, i) => {
            const badge = closeReasonBadge(tr.close_reason);
            return (
              <Card key={i} className={cn(
                'border',
                tr.pnl >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20'
              )}>
                <CardContent className="pt-4 pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-semibold text-sm">{tr.pair}</span>
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                        tr.type?.toLowerCase() === 'buy' ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                      )}>{tr.type}</span>
                    </div>
                    <span className={cn('font-mono font-semibold text-sm',
                      tr.pnl >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    )}>
                      {tr.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(tr.pnl), 'USD', locale)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatDate(tr.date, locale)}</span>
                    <span>{tr.duration || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1.5 text-xs">
                    <span className="text-muted-foreground">{genericSetup(tr.setup)}</span>
                    {badge && <span className={cn('px-2 py-0.5 rounded', badge.cls)}>{badge.label}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Cumulative PnL Chart */}
      {cumulativeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cumulative_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CumulativePnl data={cumulativeData} height={200} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
