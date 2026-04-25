'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { History, ChevronLeft, Filter, Download } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Trade {
  id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  side: 'LONG' | 'SHORT';
  quantity: number;
  entry_price: number;
  exit_price: number;
  leverage: number;
  realized_pnl_usdt: number;
  commission_usdt: number;
  funding_paid_usdt: number;
  net_pnl_usdt: number;
  duration_seconds: number;
  opened_at: string;
  closed_at: string;
  close_reason: string;
  strategy_name: string;
}

const CLOSE_REASON_LABEL: Record<string, string> = {
  tp: 'Take Profit',
  sl: 'Stop Loss',
  manual: 'Manual Close',
  kill_switch: 'Kill Switch',
  funding_exit: 'Funding Exit',
};

const CLOSE_REASON_TONE: Record<string, string> = {
  tp: 'bg-green-500/15 text-green-300',
  sl: 'bg-red-500/15 text-red-300',
  manual: 'bg-slate-500/15 text-slate-300',
  kill_switch: 'bg-amber-500/15 text-amber-300',
  funding_exit: 'bg-violet-500/15 text-violet-300',
};

function fmtNum(v: number, digits = 2): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function CryptoTradesPage() {
  const { getAuthHeaders } = useAuth();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [marketFilter, setMarketFilter] = useState<'all' | 'spot' | 'futures'>('all');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/crypto/trading/trades?limit=100', { headers: getAuthHeaders() });
        if (res.ok) {
          const body = await res.json();
          setTrades(body.items ?? []);
          setSource(body.source ?? '');
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  const filtered = useMemo(
    () => trades.filter((t) => marketFilter === 'all' || t.market_type === marketFilter),
    [trades, marketFilter],
  );

  const totals = useMemo(() => {
    const wins = filtered.filter((t) => t.net_pnl_usdt > 0);
    const losses = filtered.filter((t) => t.net_pnl_usdt < 0);
    const totalNet = filtered.reduce((s, t) => s + t.net_pnl_usdt, 0);
    return {
      total: filtered.length,
      wins: wins.length,
      losses: losses.length,
      winRate: filtered.length > 0 ? (wins.length / filtered.length) * 100 : 0,
      totalNet,
    };
  }, [filtered]);

  function exportCsv() {
    if (filtered.length === 0) return;
    const headers = ['symbol', 'market', 'side', 'qty', 'entry', 'exit', 'leverage', 'net_pnl_usdt', 'close_reason', 'strategy', 'closed_at'];
    const rows = filtered.map((t) =>
      [t.symbol, t.market_type, t.side, t.quantity, t.entry_price, t.exit_price, t.leverage, t.net_pnl_usdt, t.close_reason, t.strategy_name, t.closed_at].join(','),
    );
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-trades-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            Trade History
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">100 trade terakhir.</p>
        </div>
        {source === 'mock' && (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
            data preview
          </span>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">Total Trade</div><div className="text-xl font-bold font-mono mt-1">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">Win Rate</div><div className="text-xl font-bold font-mono mt-1 text-green-300">{totals.winRate.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">Win / Loss</div><div className="text-xl font-bold font-mono mt-1"><span className="text-green-300">{totals.wins}</span> / <span className="text-red-300">{totals.losses}</span></div></CardContent></Card>
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">Net PnL USDT</div><div className={cn('text-xl font-bold font-mono mt-1', totals.totalNet >= 0 ? 'text-green-300' : 'text-red-300')}>{totals.totalNet >= 0 ? '+' : ''}{fmtNum(totals.totalNet)}</div></CardContent></Card>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <div className="inline-flex rounded-md border border-white/10 bg-card p-0.5 text-xs">
            {(['all', 'spot', 'futures'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarketFilter(m)}
                className={cn(
                  'px-3 py-1.5 rounded font-mono uppercase transition-colors',
                  marketFilter === m ? 'bg-amber-500/15 text-amber-300' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-md bg-white/5 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">Belum ada trade pada filter ini.</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase">Symbol</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">Side</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">Net PnL</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase hidden md:table-cell">Entry</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase hidden md:table-cell">Exit</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase hidden lg:table-cell">Reason</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase hidden xl:table-cell">Strategy</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 font-mono font-semibold">{t.symbol}<div className="text-[10px] uppercase text-muted-foreground font-normal">{t.market_type}{t.leverage > 1 && ` · ${t.leverage}x`}</div></td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-mono', t.side === 'LONG' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300')}>{t.side}</span>
                      </td>
                      <td className={cn('p-3 text-right font-mono font-semibold', t.net_pnl_usdt >= 0 ? 'text-green-300' : 'text-red-300')}>
                        {t.net_pnl_usdt >= 0 ? '+' : ''}{fmtNum(t.net_pnl_usdt)}
                      </td>
                      <td className="p-3 text-right font-mono hidden md:table-cell">{fmtNum(t.entry_price)}</td>
                      <td className="p-3 text-right font-mono hidden md:table-cell">{fmtNum(t.exit_price)}</td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-mono', CLOSE_REASON_TONE[t.close_reason] ?? 'bg-slate-500/15 text-slate-300')}>
                          {CLOSE_REASON_LABEL[t.close_reason] ?? t.close_reason}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">{t.strategy_name}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{fmtDuration(t.duration_seconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
