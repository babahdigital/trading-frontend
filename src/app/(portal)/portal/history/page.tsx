'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CumulativePnl } from '@/components/charts/cumulative-pnl';
import { useAuth } from '@/lib/auth/auth-context';

interface Trade {
  date: string;
  pair: string;
  type: string;
  pnl: number;
  duration?: string;
  setup?: string;
  close_reason?: string;
}

// Map technical strategy names to generic labels for client
function genericSetup(setup?: string): string {
  if (!setup) return '-';
  const map: Record<string, string> = {
    smc: 'Strategi A', wyckoff: 'Strategi B', momentum: 'Strategi C',
    oil_gas: 'Strategi D', astronacci: 'Strategi E', swing: 'Strategi F',
  };
  return map[setup.toLowerCase()] || setup;
}

function closeReasonBadge(reason?: string) {
  if (!reason) return null;
  const r = reason.toLowerCase();
  if (r.includes('take_profit') || r.includes('tp')) return { label: 'Take Profit', cls: 'bg-green-500/20 text-green-400' };
  if (r.includes('stop_loss') || r.includes('sl')) return { label: 'Stop Loss', cls: 'bg-red-500/20 text-red-400' };
  if (r.includes('manual')) return { label: 'Manual', cls: 'bg-blue-500/20 text-blue-400' };
  if (r.includes('max_hold')) return { label: 'Max Hold', cls: 'bg-yellow-500/20 text-yellow-400' };
  return { label: reason, cls: 'bg-slate-500/20 text-slate-400' };
}

export default function HistoryPage() {
  const { getAuthHeaders } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);
  const [pairFilter, setPairFilter] = useState('');

  const fetchTrades = useCallback(async (d: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/client/trades?days=${d}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch trades');
      const data = await res.json();
      setTrades(Array.isArray(data) ? data : data.trades || []);
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchTrades(days); }, [days, fetchTrades]);

  const filtered = pairFilter
    ? trades.filter((t) => t.pair?.toLowerCase().includes(pairFilter.toLowerCase()))
    : trades;

  const totalPnl = filtered.reduce((sum, t) => sum + (t.pnl || 0), 0);

  // Build cumulative PnL data
  const cumulativeData = (() => {
    let cum = 0;
    return filtered.map((t, i) => {
      cum += t.pnl || 0;
      return { trade: i + 1, pnl: Math.round(cum * 100) / 100 };
    });
  })();

  function csvEscape(val: string | number): string {
    const s = String(val);
    const needsPrefix = /^[=+\-@\t\r]/.test(s);
    const escaped = s.includes('"') || s.includes(',') || s.includes('\n') || needsPrefix
      ? `"${needsPrefix ? "'" : ''}${s.replace(/"/g, '""')}"`
      : s;
    return escaped;
  }

  function exportCsv() {
    if (filtered.length === 0) return;
    const headers = ['Date', 'Pair', 'Type', 'P&L', 'Duration', 'Strategy', 'Close Reason'];
    const rows = filtered.map((t) => [
      csvEscape(t.date), csvEscape(t.pair), csvEscape(t.type), csvEscape(t.pnl),
      csvEscape(t.duration || ''), csvEscape(genericSetup(t.setup)), csvEscape(t.close_reason || ''),
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trade-history-${days}d.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Riwayat Perdagangan</h1>
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
          Export CSV
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Total Trades</p>
              <p className="text-xl font-bold font-mono">{filtered.length}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total P&L</p>
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
              {d}D
            </Button>
          ))}
        </div>
        <Input
          placeholder="Filter pair..."
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
          <CardTitle className="text-sm font-medium">Trades</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-muted-foreground text-sm">Loading...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No trades found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-muted-foreground">Tanggal</th>
                    <th className="pb-3 font-medium text-muted-foreground">Pair</th>
                    <th className="pb-3 font-medium text-muted-foreground">Arah</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Hasil ($)</th>
                    <th className="pb-3 font-medium text-muted-foreground text-right">Durasi</th>
                    <th className="pb-3 font-medium text-muted-foreground">Strategi</th>
                    <th className="pb-3 font-medium text-muted-foreground">Alasan Tutup</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t, i) => {
                    const badge = closeReasonBadge(t.close_reason);
                    return (
                      <tr key={i} className={cn('border-b border-border/50 last:border-0',
                        t.pnl >= 0 ? 'bg-green-500/[0.02]' : 'bg-red-500/[0.02]'
                      )}>
                        <td className="py-3 text-muted-foreground text-xs">{t.date}</td>
                        <td className="py-3 font-mono font-medium">{t.pair}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                            t.type?.toLowerCase() === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          )}>{t.type}</span>
                        </td>
                        <td className={cn('py-3 text-right font-mono font-medium', t.pnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-muted-foreground">{t.duration || '-'}</td>
                        <td className="py-3 text-muted-foreground text-xs">{genericSetup(t.setup)}</td>
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
            <CardTitle className="text-sm font-medium">Cumulative PnL</CardTitle>
          </CardHeader>
          <CardContent>
            <CumulativePnl data={cumulativeData} height={200} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
