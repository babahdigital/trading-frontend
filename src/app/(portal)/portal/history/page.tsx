'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { History as HistoryIcon, Download } from 'lucide-react';
import { CumulativePnl } from '@/components/charts/cumulative-pnl';
import { useAuth } from '@/lib/auth/auth-context';
import { csvEscape } from '@/lib/csv';
import { strategyDisplayName, isStrategyObfuscationEnabled } from '@/lib/trading/strategy-names';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatCurrency, formatDate } from '@/lib/format-locale';
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

export default function HistoryPage() {
  const t = useTranslations('portal.history');
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
    if (r.includes('take_profit') || r.includes('tp')) return { label: t('close_reason_take_profit'), cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' };
    if (r.includes('stop_loss') || r.includes('sl')) return { label: t('close_reason_stop_loss'), cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300' };
    if (r.includes('manual')) return { label: t('close_reason_manual'), cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' };
    if (r.includes('max_hold')) return { label: t('close_reason_max_hold'), cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' };
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

  useEffect(() => { fetchTrades(days); }, [days, fetchTrades]);

  const filtered = pairFilter
    ? trades.filter((tr) => tr.pair?.toLowerCase().includes(pairFilter.toLowerCase()))
    : trades;

  const totalPnl = filtered.reduce((sum, tr) => sum + (tr.pnl || 0), 0);

  // Build cumulative PnL data
  const cumulativeData = (() => {
    let cum = 0;
    return filtered.map((tr, i) => {
      cum += tr.pnl || 0;
      return { trade: i + 1, pnl: Math.round(cum * 100) / 100 };
    });
  })();

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
    a.download = `${t('csv_filename', { days })}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="portal-page-stack">
      <PageHeader
        title={t('title')}
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-1.5" />
            {t('export_csv')}
          </Button>
        }
      />

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('summary_total_trades')}</p>
              <p className="kpi-value text-xl mt-1">{filtered.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t('summary_total_pnl')}</p>
              <p className={cn('kpi-value text-xl mt-1', totalPnl >= 0 ? 'currency-pos' : 'currency-neg')}>
                {totalPnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(totalPnl), 'USD', locale)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Periode" className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} role="tab" aria-selected={days === d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d}{t('filter_days_suffix')}
            </Button>
          ))}
        </div>
        <Input
          type="search"
          placeholder={t('filter_pair_placeholder')}
          value={pairFilter}
          onChange={(e) => setPairFilter(e.target.value)}
          className="w-full sm:w-48 bg-background"
          aria-label={t('filter_pair_placeholder')}
        />
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Trades — desktop table + mobile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('list_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={HistoryIcon}
              title={t('empty')}
              size="sm"
            />
          ) : (
            <>
              {/* Desktop table (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_date')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_pair')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_direction')}</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">{t('table_result')}</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">{t('table_duration')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_strategy')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_close_reason')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((tr, i) => {
                      const badge = closeReasonBadge(tr.close_reason);
                      return (
                        <tr key={i} className={cn('border-b border-border/50 last:border-0',
                          tr.pnl >= 0 ? 'bg-emerald-500/[0.03]' : 'bg-rose-500/[0.03]'
                        )}>
                          <td className="py-3 text-muted-foreground text-xs">{tr.date}</td>
                          <td className="py-3 font-mono font-medium">{tr.pair}</td>
                          <td className="py-3">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                              tr.type?.toLowerCase() === 'buy'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                            )}>{tr.type}</span>
                          </td>
                          <td className={cn('py-3 text-right font-mono font-medium', tr.pnl >= 0 ? 'currency-pos' : 'currency-neg')}>
                            {tr.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(tr.pnl), 'USD', locale)}
                          </td>
                          <td className="py-3 text-right text-muted-foreground">{tr.duration || '-'}</td>
                          <td className="py-3 text-muted-foreground text-xs">{genericSetup(tr.setup)}</td>
                          <td className="py-3">
                            {badge && <span className={cn('px-2 py-0.5 rounded text-xs font-medium', badge.cls)}>{badge.label}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile card stack (<md) — fix audit P1 portal */}
              <ul className="md:hidden space-y-2" aria-label={t('list_title')}>
                {filtered.map((tr, i) => {
                  const badge = closeReasonBadge(tr.close_reason);
                  return (
                    <li
                      key={i}
                      className={cn(
                        'rounded-lg border p-3 transition-colors',
                        tr.pnl >= 0 ? 'border-emerald-500/30 bg-emerald-500/[0.03]' : 'border-rose-500/30 bg-rose-500/[0.03]',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-semibold text-sm">{tr.pair}</span>
                            <span className={cn(
                              'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                              tr.type?.toLowerCase() === 'buy'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                            )}>{tr.type}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground mt-0.5">{formatDate(tr.date, locale)}</div>
                        </div>
                        <div className={cn('font-mono font-semibold text-sm tabular-nums', tr.pnl >= 0 ? 'currency-pos' : 'currency-neg')}>
                          {tr.pnl >= 0 ? '+' : ''}{formatCurrency(Math.abs(tr.pnl), 'USD', locale)}
                        </div>
                      </div>
                      <dl className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">{t('table_duration')}</dt>
                          <dd className="text-foreground/80 mt-0.5">{tr.duration || '-'}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">{t('table_strategy')}</dt>
                          <dd className="text-foreground/80 mt-0.5 truncate">{genericSetup(tr.setup)}</dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">{t('table_close_reason')}</dt>
                          <dd className="mt-0.5">
                            {badge ? (
                              <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium', badge.cls)}>{badge.label}</span>
                            ) : '-'}
                          </dd>
                        </div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      {/* Cumulative PnL Chart */}
      {cumulativeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{t('cumulative_pnl_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <CumulativePnl data={cumulativeData} height={200} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
