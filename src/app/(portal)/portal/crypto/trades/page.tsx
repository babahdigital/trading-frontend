'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
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

const CLOSE_REASON_KEY: Record<string, string> = {
  tp: 'reason_tp',
  sl: 'reason_sl',
  manual: 'reason_manual',
  kill_switch: 'reason_kill_switch',
  funding_exit: 'reason_funding_exit',
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
  const t = useTranslations('portal.crypto.trades');
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
    () => trades.filter((tr) => marketFilter === 'all' || tr.market_type === marketFilter),
    [trades, marketFilter],
  );

  const totals = useMemo(() => {
    const wins = filtered.filter((tr) => tr.net_pnl_usdt > 0);
    const losses = filtered.filter((tr) => tr.net_pnl_usdt < 0);
    const totalNet = filtered.reduce((s, tr) => s + tr.net_pnl_usdt, 0);
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
    const rows = filtered.map((tr) =>
      [tr.symbol, tr.market_type, tr.side, tr.quantity, tr.entry_price, tr.exit_price, tr.leverage, tr.net_pnl_usdt, tr.close_reason, tr.strategy_name, tr.closed_at].join(','),
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

  function reasonLabel(reason: string): string {
    const key = CLOSE_REASON_KEY[reason];
    return key ? t(key) : reason;
  }

  return (
    <div className="space-y-6">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> {t('back')}
      </Link>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <History className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            {t('heading')}
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm">{t('tagline')}</p>
        </div>
        {source === 'mock' && (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
            {t('data_preview_badge')}
          </span>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">{t('kpi_total')}</div><div className="text-xl font-bold font-mono mt-1">{totals.total}</div></CardContent></Card>
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">{t('kpi_winrate')}</div><div className="text-xl font-bold font-mono mt-1 text-green-300">{totals.winRate.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">{t('kpi_winloss')}</div><div className="text-xl font-bold font-mono mt-1"><span className="text-green-300">{totals.wins}</span> / <span className="text-red-300">{totals.losses}</span></div></CardContent></Card>
        <Card><CardContent className="p-3.5"><div className="text-[10px] uppercase text-muted-foreground">{t('kpi_net')}</div><div className={cn('text-xl font-bold font-mono mt-1', totals.totalNet >= 0 ? 'text-green-300' : 'text-red-300')}>{totals.totalNet >= 0 ? '+' : ''}{fmtNum(totals.totalNet)}</div></CardContent></Card>
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
                {t(`filter_${m}`)}
              </button>
            ))}
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download className="h-4 w-4 mr-2" /> {t('export_csv')}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 rounded-md bg-white/5 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground">{t('empty')}</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase">{t('col_symbol')}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">{t('col_side')}</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase">{t('col_net_pnl')}</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase hidden md:table-cell">{t('col_entry')}</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase hidden md:table-cell">{t('col_exit')}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase hidden lg:table-cell">{t('col_reason')}</th>
                    <th className="text-left p-3 font-medium text-muted-foreground text-xs uppercase hidden xl:table-cell">{t('col_strategy')}</th>
                    <th className="text-right p-3 font-medium text-muted-foreground text-xs uppercase hidden sm:table-cell">{t('col_duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tr) => (
                    <tr key={tr.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                      <td className="p-3 font-mono font-semibold">{tr.symbol}<div className="text-[10px] uppercase text-muted-foreground font-normal">{tr.market_type}{tr.leverage > 1 && ` · ${tr.leverage}x`}</div></td>
                      <td className="p-3 hidden sm:table-cell">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-mono', tr.side === 'LONG' ? 'bg-green-500/15 text-green-300' : 'bg-red-500/15 text-red-300')}>{tr.side}</span>
                      </td>
                      <td className={cn('p-3 text-right font-mono font-semibold', tr.net_pnl_usdt >= 0 ? 'text-green-300' : 'text-red-300')}>
                        {tr.net_pnl_usdt >= 0 ? '+' : ''}{fmtNum(tr.net_pnl_usdt)}
                      </td>
                      <td className="p-3 text-right font-mono hidden md:table-cell">{fmtNum(tr.entry_price)}</td>
                      <td className="p-3 text-right font-mono hidden md:table-cell">{fmtNum(tr.exit_price)}</td>
                      <td className="p-3 hidden lg:table-cell">
                        <span className={cn('px-2 py-0.5 rounded text-xs font-mono', CLOSE_REASON_TONE[tr.close_reason] ?? 'bg-slate-500/15 text-slate-300')}>
                          {reasonLabel(tr.close_reason)}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground hidden xl:table-cell">{tr.strategy_name}</td>
                      <td className="p-3 text-right font-mono text-muted-foreground hidden sm:table-cell">{fmtDuration(tr.duration_seconds)}</td>
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
