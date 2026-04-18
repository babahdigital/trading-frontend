'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';

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
      return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'LOSS':
      return 'bg-rose-500/15 text-rose-400 border-rose-500/30';
    case 'BREAKEVEN':
      return 'bg-slate-500/15 text-slate-300 border-slate-500/30';
    case 'OPEN':
      return 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    case 'CANCELLED':
      return 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    default:
      return 'bg-sky-500/15 text-sky-400 border-sky-500/30';
  }
}

export default function SignalAuditPage() {
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
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setRows(data.items ?? []);
      setTotal(data.total ?? 0);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Signal Audit</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Jejak lengkap sinyal dari mesin produksi — entry, stop loss, take profit, dan hasilnya.
        </p>
      </div>

      {error && (
        <div role="alert" className="rounded-md bg-rose-500/10 border border-rose-500/30 p-3 text-sm text-rose-400">
          {error}
        </div>
      )}

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <label htmlFor="pair" className="text-xs text-muted-foreground mb-1 block">Pair</label>
              <Input id="pair" placeholder="XAUUSD" value={pair} onChange={(e) => setPair(e.target.value)} />
            </div>
            <div>
              <label htmlFor="outcome" className="text-xs text-muted-foreground mb-1 block">Outcome</label>
              <select
                id="outcome"
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
              >
                {OUTCOMES.map((o) => <option key={o} value={o}>{o || 'Semua'}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="conf" className="text-xs text-muted-foreground mb-1 block">Min confidence</label>
              <Input id="conf" type="number" step="0.01" min="0" max="1" placeholder="0.70"
                value={minConf} onChange={(e) => setMinConf(e.target.value)} />
            </div>
            <div className="flex items-end gap-2">
              <Button type="button" onClick={() => { setOffset(0); load(); }} className="flex-1">
                Terapkan
              </Button>
              <Button type="button" variant="outline" onClick={() => { setPair(''); setOutcome(''); setMinConf(''); setOffset(0); }}>
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card border-border">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {loading ? 'Memuat…' : `${total.toLocaleString()} record`}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - limit))}>‹ Sebelumnya</Button>
            <span className="text-xs text-muted-foreground">
              {total === 0 ? '0' : `${offset + 1}–${Math.min(offset + rows.length, total)}`} / {total}
            </span>
            <Button variant="outline" size="sm" disabled={offset + rows.length >= total || loading}
              onClick={() => setOffset(offset + limit)}>Berikutnya ›</Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border/50">
                <tr>
                  <th className="text-left py-2 px-2">Waktu</th>
                  <th className="text-left py-2 px-2">Pair</th>
                  <th className="text-left py-2 px-2">Dir</th>
                  <th className="text-right py-2 px-2">Entry</th>
                  <th className="text-right py-2 px-2">SL</th>
                  <th className="text-right py-2 px-2">TP</th>
                  <th className="text-right py-2 px-2">Conf</th>
                  <th className="text-right py-2 px-2">P/L</th>
                  <th className="text-center py-2 px-2">Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && !loading && (
                  <tr><td colSpan={9} className="py-8 text-center text-muted-foreground">
                    Belum ada sinyal yang cocok dengan filter ini.
                  </td></tr>
                )}
                {rows.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                        className="border-b border-border/30 hover:bg-white/5 cursor-pointer focus-within:bg-white/5"
                        onClick={() => toggleExpand(r.id)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') toggleExpand(r.id); }}>
                      <td className="py-2 px-2 text-xs text-muted-foreground tabular-nums">
                        {new Date(r.emittedAt).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-2 px-2 font-medium">{r.pair}</td>
                      <td className="py-2 px-2">
                        <span className={cn('text-xs font-medium', r.direction === 'BUY' ? 'text-emerald-400' : 'text-rose-400')}>
                          {r.direction}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right tabular-nums">{r.entryPrice ?? '—'}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-rose-300/80">{r.stopLoss ?? '—'}</td>
                      <td className="py-2 px-2 text-right tabular-nums text-emerald-300/80">{r.takeProfit ?? '—'}</td>
                      <td className="py-2 px-2 text-right tabular-nums">
                        {r.confidence ? Number(r.confidence).toFixed(2) : '—'}
                      </td>
                      <td className={cn('py-2 px-2 text-right tabular-nums',
                        r.profitUsd && Number(r.profitUsd) > 0 ? 'text-emerald-400' :
                        r.profitUsd && Number(r.profitUsd) < 0 ? 'text-rose-400' : 'text-muted-foreground')}>
                        {r.profitUsd ? `$${Number(r.profitUsd).toFixed(2)}` : '—'}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span className={cn('inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border', outcomeClass(r.outcome))}>
                          {r.outcome}
                        </span>
                      </td>
                    </tr>
                    {expanded.has(r.id) && (
                      <tr className="border-b border-border/30 bg-white/[0.02]">
                        <td colSpan={9} className="py-3 px-4 text-xs text-muted-foreground">
                          <div className="grid gap-2 md:grid-cols-3">
                            <div><span className="text-foreground/60">Source ID:</span> <span className="font-mono">{r.sourceId}</span></div>
                            <div><span className="text-foreground/60">Entry Type:</span> {r.entryType ?? '—'}</div>
                            <div><span className="text-foreground/60">Lot:</span> {r.lot ?? '—'}</div>
                            {r.closedAt && <div><span className="text-foreground/60">Closed at:</span> {new Date(r.closedAt).toLocaleString('id-ID')}</div>}
                            {r.closePrice && <div><span className="text-foreground/60">Close price:</span> {r.closePrice}</div>}
                            {r.closeReason && <div><span className="text-foreground/60">Close reason:</span> {r.closeReason}</div>}
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
        </CardContent>
      </Card>
    </div>
  );
}
