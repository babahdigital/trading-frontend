'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Activity, ChevronLeft, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Position {
  id: number;
  symbol: string;
  market_type: 'spot' | 'futures';
  side: 'LONG' | 'SHORT';
  entry_price: number;
  quantity: number;
  leverage: number;
  unrealized_pnl_usdt: number;
  sl_price: number | null;
  tp_price: number | null;
  liquidation_price: number | null;
  margin_usdt: number | null;
  status: string;
  strategy_name: string;
  opened_at: string;
}

function fmtNum(v: number | null, digits = 2): string {
  if (v == null) return '—';
  return v.toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function fmtAge(opened: string): string {
  const ms = Date.now() - new Date(opened).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function CryptoPositionsPage() {
  const { getAuthHeaders } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch('/api/crypto/trading/positions', { headers: getAuthHeaders() });
      if (res.ok) {
        const body = await res.json();
        setPositions(body.items ?? []);
        setSource(body.source ?? '');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
    const t = setInterval(load, 10_000);
    return () => clearInterval(t);
  }, [load]);

  return (
    <div className="space-y-6">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Activity className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            Live Positions
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">Auto-refresh tiap 10 detik.</p>
        </div>
        <div className="flex items-center gap-2">
          {source === 'mock' && (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
              data preview
            </span>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-24 rounded-md bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : positions.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Tidak ada posisi terbuka saat ini.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile/tablet: cards */}
          <div className="grid gap-3 lg:hidden">
            {positions.map((p) => {
              const long = p.side === 'LONG';
              const Icon = long ? TrendingUp : TrendingDown;
              const pnlPos = p.unrealized_pnl_usdt >= 0;
              return (
                <Card key={p.id}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={cn('inline-flex h-8 w-8 rounded-full items-center justify-center border',
                          long ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-red-500/10 border-red-500/30 text-red-400',
                        )}>
                          <Icon className="h-4 w-4" />
                        </span>
                        <div>
                          <div className="font-mono font-bold">{p.symbol}</div>
                          <div className="text-[10px] uppercase font-mono text-muted-foreground">
                            {p.market_type} · {p.leverage}x · {p.strategy_name}
                          </div>
                        </div>
                      </div>
                      <div className={cn('text-right font-mono font-bold', pnlPos ? 'text-green-300' : 'text-red-300')}>
                        {pnlPos && '+'}${fmtNum(p.unrealized_pnl_usdt)}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                      <div><div className="text-[10px] uppercase text-muted-foreground">Entry</div><div>{fmtNum(p.entry_price, 2)}</div></div>
                      <div><div className="text-[10px] uppercase text-muted-foreground">SL</div><div className="text-red-300/80">{fmtNum(p.sl_price, 2)}</div></div>
                      <div><div className="text-[10px] uppercase text-muted-foreground">TP</div><div className="text-green-300/80">{fmtNum(p.tp_price, 2)}</div></div>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground">
                      <span>qty {fmtNum(p.quantity, 4)}</span>
                      <span>{fmtAge(p.opened_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Desktop: table */}
          <Card className="hidden lg:block">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase">Symbol</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase">Side</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">Qty</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">Entry</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">SL</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">TP</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">PnL USDT</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">Lev</th>
                      <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase">Strategy</th>
                      <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">Age</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((p) => {
                      const pnlPos = p.unrealized_pnl_usdt >= 0;
                      return (
                        <tr key={p.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="p-3 font-mono font-semibold">{p.symbol}</td>
                          <td className="p-3">
                            <span className={cn('px-2 py-0.5 rounded text-xs font-mono', p.side === 'LONG' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300')}>
                              {p.side}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono">{fmtNum(p.quantity, 4)}</td>
                          <td className="p-3 text-right font-mono">{fmtNum(p.entry_price)}</td>
                          <td className="p-3 text-right font-mono text-red-300/80">{fmtNum(p.sl_price)}</td>
                          <td className="p-3 text-right font-mono text-green-300/80">{fmtNum(p.tp_price)}</td>
                          <td className={cn('p-3 text-right font-mono font-semibold', pnlPos ? 'text-green-300' : 'text-red-300')}>
                            {pnlPos && '+'}${fmtNum(p.unrealized_pnl_usdt)}
                          </td>
                          <td className="p-3 text-right font-mono">{p.leverage}x</td>
                          <td className="p-3 text-xs text-muted-foreground">{p.strategy_name}</td>
                          <td className="p-3 text-right font-mono text-muted-foreground">{fmtAge(p.opened_at)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
