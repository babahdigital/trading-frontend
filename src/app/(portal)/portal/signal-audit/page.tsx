'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { PageHeader } from '@/components/admin/page-header';
import { EmptyState } from '@/components/admin/empty-state';
import { formatDateTime, formatCurrency } from '@/lib/format-locale';
import type { Locale } from '@/lib/format-locale';
import { FileSearch } from 'lucide-react';

interface SignalRow {
  id: string;
  sourceId: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entryType: string | null;
  lot: string | null;
  entryPrice: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  confidence: string | null;
  reasoning: string | null;
  outcome: 'PENDING' | 'OPEN' | 'WIN' | 'LOSS' | 'BREAKEVEN' | 'CANCELLED';
  closePrice: string | null;
  closeReason: string | null;
  profitUsd: string | null;
  emittedAt: string;
  closedAt: string | null;
}

const OUTCOMES = ['', 'OPEN', 'WIN', 'LOSS', 'BREAKEVEN', 'CANCELLED'] as const;

function outcomeClass(outcome: SignalRow['outcome']) {
  switch (outcome) {
    case 'WIN':
      return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30';
    case 'LOSS':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30';
    case 'BREAKEVEN':
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30';
    case 'OPEN':
      return 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30';
    case 'CANCELLED':
      return 'bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30';
    default:
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30';
  }
}

export default function SignalAuditPage() {
  const t = useTranslations('portal.signal_audit');
  const locale = useLocale() as Locale;
  const { getAuthHeaders } = useAuth();
  const [rows, setRows] = useState<SignalRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const [pair, setPair] = useState('');
  const [outcome, setOutcome] = useState<string>('');
  const [minConf, setMinConf] = useState('');
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (pair) params.set('pair', pair.trim().toUpperCase());
    if (outcome) params.set('outcome', outcome);
    if (minConf) params.set('min_confidence', minConf);
    params.set('limit', String(limit));
    params.set('offset', String(offset));

    try {
      const res = await fetch(`/api/client/signal-audit?${params.toString()}`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(t('fetch_failed', { status: res.status }));
      const data = await res.json();
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unknown_error'));
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pair, outcome, minConf, offset]);

  useEffect(() => { load(); }, [load]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="portal-page-stack">
      <PageHeader
        title={t('title')}
        description={t('subtitle')}
      />

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">{t('filter_title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label htmlFor="pair" className="text-xs text-muted-foreground mb-1 block">{t('filter_pair')}</label>
              <Input id="pair" placeholder="XAUUSD" value={pair} onChange={(e) => setPair(e.target.value)} />
            </div>
            <div>
              <label htmlFor="outcome" className="text-xs text-muted-foreground mb-1 block">{t('filter_outcome')}</label>
              <select
                id="outcome"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {OUTCOMES.map((o) => <option key={o} value={o}>{o || t('filter_outcome_all')}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="conf" className="text-xs text-muted-foreground mb-1 block">{t('filter_min_confidence')}</label>
              <Input id="conf" type="number" step="0.01" min="0" max="1" placeholder="0.70"
                value={minConf} onChange={(e) => setMinConf(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" onClick={() => { setOffset(0); load(); }} className="flex-1">
                {t('apply')}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setPair(''); setOutcome(''); setMinConf(''); setOffset(0); }}>
                {t('reset')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base font-semibold">
            {loading ? t('loading') : t('records_count', { count: total.toLocaleString() })}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - limit))}>{t('prev_page')}</Button>
            <span className="text-xs text-muted-foreground">
              {total === 0 ? '0' : `${offset + 1}–${Math.min(offset + rows.length, total)}`} / {total}
            </span>
            <Button variant="outline" size="sm" disabled={offset + rows.length >= total || loading}
              onClick={() => setOffset(offset + limit)}>{t('next_page')}</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded bg-muted animate-pulse" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              variant="inline"
              icon={FileSearch}
              title={t('empty')}
              size="sm"
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                    <tr>
                      <th className="text-left py-2 px-2">{t('table_time')}</th>
                      <th className="text-left py-2 px-2">{t('table_pair')}</th>
                      <th className="text-left py-2 px-2">{t('table_dir')}</th>
                      <th className="text-right py-2 px-2">{t('table_entry')}</th>
                      <th className="text-right py-2 px-2">{t('table_sl')}</th>
                      <th className="text-right py-2 px-2">{t('table_tp')}</th>
                      <th className="text-right py-2 px-2">{t('table_conf')}</th>
                      <th className="text-right py-2 px-2">{t('table_pl')}</th>
                      <th className="text-center py-2 px-2">{t('table_outcome')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <Fragment key={r.id}>
                        <tr
                            className="border-b border-border/30 hover:bg-muted/40 cursor-pointer focus-within:bg-muted/40"
                            onClick={() => toggleExpand(r.id)}
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter') toggleExpand(r.id); }}>
                          <td className="py-2 px-2 text-xs text-muted-foreground tabular-nums">
                            {formatDateTime(r.emittedAt, locale)}
                          </td>
                          <td className="py-2 px-2 font-medium font-mono">{r.pair}</td>
                          <td className="py-2 px-2">
                            <span className={cn('text-xs font-medium', r.direction === 'BUY' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
                              {r.direction}
                            </span>
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums">{r.entryPrice ?? '—'}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-rose-600/80 dark:text-rose-300/80">{r.stopLoss ?? '—'}</td>
                          <td className="py-2 px-2 text-right tabular-nums text-emerald-600/80 dark:text-emerald-300/80">{r.takeProfit ?? '—'}</td>
                          <td className="py-2 px-2 text-right tabular-nums">
                            {r.confidence ? Number(r.confidence).toFixed(2) : '—'}
                          </td>
                          <td className={cn('py-2 px-2 text-right tabular-nums',
                            r.profitUsd && Number(r.profitUsd) > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                            r.profitUsd && Number(r.profitUsd) < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                            {r.profitUsd ? formatCurrency(Number(r.profitUsd), 'USD', locale) : '—'}
                          </td>
                          <td className="py-2 px-2 text-center">
                            <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border', outcomeClass(r.outcome))}>
                              {r.outcome}
                            </span>
                          </td>
                        </tr>
                        {expanded.has(r.id) && (
                          <tr className="border-b border-border/30 bg-muted/30">
                            <td colSpan={9} className="py-3 px-4 text-xs text-muted-foreground">
                              <div className="grid gap-2 md:grid-cols-3">
                                <div><span className="text-foreground/60">{t('detail_source_id')}</span> <span className="font-mono">{r.sourceId}</span></div>
                                <div><span className="text-foreground/60">{t('detail_entry_type')}</span> {r.entryType ?? '—'}</div>
                                <div><span className="text-foreground/60">{t('detail_lot')}</span> {r.lot ?? '—'}</div>
                                {r.closedAt && <div><span className="text-foreground/60">{t('detail_closed_at')}</span> {formatDateTime(r.closedAt, locale)}</div>}
                                {r.closePrice && <div><span className="text-foreground/60">{t('detail_close_price')}</span> {r.closePrice}</div>}
                                {r.closeReason && <div><span className="text-foreground/60">{t('detail_close_reason')}</span> {r.closeReason}</div>}
                              </div>
                              {r.reasoning && (
                                <p className="mt-3 whitespace-pre-wrap text-foreground/80">{r.reasoning}</p>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card stack — audit P1 fix */}
              <ul className="md:hidden space-y-2" aria-label={t('records_count', { count: total.toLocaleString() })}>
                {rows.map((r) => {
                  const isExpanded = expanded.has(r.id);
                  const profit = r.profitUsd ? Number(r.profitUsd) : null;
                  return (
                    <li
                      key={r.id}
                      className={cn(
                        'rounded-lg border p-3 transition-colors',
                        r.direction === 'BUY' ? 'border-emerald-500/20' : 'border-rose-500/20',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(r.id)}
                        className="w-full text-left"
                        aria-expanded={isExpanded}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-semibold text-sm">{r.pair}</span>
                              <span className={cn(
                                'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase',
                                r.direction === 'BUY'
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
                              )}>{r.direction}</span>
                              <span className={cn('inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border', outcomeClass(r.outcome))}>
                                {r.outcome}
                              </span>
                            </div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{formatDateTime(r.emittedAt, locale)}</div>
                          </div>
                          {profit != null && (
                            <div className={cn('font-mono font-semibold text-sm tabular-nums',
                              profit > 0 ? 'text-emerald-600 dark:text-emerald-400' :
                              profit < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-muted-foreground')}>
                              {formatCurrency(profit, 'USD', locale)}
                            </div>
                          )}
                        </div>
                        <dl className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">{t('table_entry')}</dt>
                            <dd className="font-mono tabular-nums mt-0.5">{r.entryPrice ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">{t('table_sl')}</dt>
                            <dd className="font-mono tabular-nums mt-0.5 text-rose-600/80 dark:text-rose-300/80">{r.stopLoss ?? '—'}</dd>
                          </div>
                          <div>
                            <dt className="text-muted-foreground/70 text-[10px] uppercase tracking-wider">{t('table_tp')}</dt>
                            <dd className="font-mono tabular-nums mt-0.5 text-emerald-600/80 dark:text-emerald-300/80">{r.takeProfit ?? '—'}</dd>
                          </div>
                        </dl>
                      </button>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-border/40 text-xs text-muted-foreground space-y-1">
                          <div><span className="text-foreground/60">{t('detail_source_id')}</span> <span className="font-mono">{r.sourceId}</span></div>
                          <div><span className="text-foreground/60">{t('detail_entry_type')}</span> {r.entryType ?? '—'}</div>
                          <div><span className="text-foreground/60">{t('detail_lot')}</span> {r.lot ?? '—'}</div>
                          {r.confidence && <div><span className="text-foreground/60">{t('table_conf')}</span> {Number(r.confidence).toFixed(2)}</div>}
                          {r.closedAt && <div><span className="text-foreground/60">{t('detail_closed_at')}</span> {formatDateTime(r.closedAt, locale)}</div>}
                          {r.closePrice && <div><span className="text-foreground/60">{t('detail_close_price')}</span> {r.closePrice}</div>}
                          {r.closeReason && <div><span className="text-foreground/60">{t('detail_close_reason')}</span> {r.closeReason}</div>}
                          {r.reasoning && <p className="mt-2 whitespace-pre-wrap text-foreground/80">{r.reasoning}</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
