'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CumulativePnl } from '@/components/charts/cumulative-pnl';
import { useAuth } from '@/lib/auth/auth-context';
import { csvEscape } from '@/lib/csv';
import { strategyDisplayName, isStrategyObfuscationEnabled } from '@/lib/trading/strategy-names';

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
  const { getAuthHeaders } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [pairFilter, setPairFilter] = useState('');

  function closeReasonBadge(reason?: string) {
    if (!reason) return null;
    const r = reason.toLowerCase();
    if (r.includes('take_profit') || r.includes('tp')) return { label: t('close_reason_take_profit'), cls: 'bg-green-500/20 text-green-400' };
    if (r.includes('stop_loss') || r.includes('sl')) return { label: t('close_reason_stop_loss'), cls: 'bg-red-500/20 text-red-400' };
    if (r.includes('manual')) return { label: t('close_reason_manual'), cls: 'bg-blue-500/20 text-blue-400' };
    if (r.includes('max_hold')) return { label: t('close_reason_max_hold'), cls: 'bg-yellow-500/20 text-yellow-400' };
    return { label: reason, cls: 'bg-slate-500/20 text-slate-400' };
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          {t('export_csv')}
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">{t('summary_total_trades')}</p>
              <p className="text-xl font-bold font-mono">{filtered.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('summary_total_pnl')}</p>
              <p className={cn('text-xl font-bold font-mono', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} variant={days === d ? 'default' : 'outline'} size="sm" onClick={() => setDays(d)}>
              {d}{t('filter_days_suffix')}
            </Button>
          ))}
        </div>
        <Input
          placeholder={t('filter_pair_placeholder')}
          value={pairFilter}
          onChange={(e) => setPairFilter(e.target.value)}
          className="w-48 bg-background"
        />
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">{t('list_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">{tShared('loading')}</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">{t('empty')}</div>
          ) : (
            <div className="overflow-x-auto">
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
                        tr.pnl >= 0 ? 'bg-green-500/[0.02]' : 'bg-red-500/[0.02]'
                      )}>
                        <td className="py-3 text-muted-foreground text-xs">{tr.date}</td>
                        <td className="py-3 font-mono font-medium">{tr.pair}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                            tr.type?.toLowerCase() === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          )}>{tr.type}</span>
                        </td>
                        <td className={cn('py-3 text-right font-mono font-medium', tr.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {tr.pnl >= 0 ? '+' : ''}${tr.pnl.toFixed(2)}
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
