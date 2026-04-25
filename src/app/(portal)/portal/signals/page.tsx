'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, AlertCircle, RefreshCw, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Signal {
  id?: string | number;
  sourceId?: string;
  pair: string;
  direction: 'BUY' | 'SELL';
  entryType?: string;
  entry_type?: string;
  confidence?: number | string;
  reasoning?: string;
  entryPrice?: number | string;
  entry_price_hint?: number | string;
  stopLoss?: number | string;
  stop_loss?: number | string;
  takeProfit?: number | string;
  take_profit?: number | string;
  emittedAt?: string;
  emitted_at?: string;
  outcome?: string;
}

function formatPrice(value: unknown): string {
  if (value == null || value === '') return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { maximumFractionDigits: 5, minimumFractionDigits: 2 });
}

function formatConfidence(value: unknown): string {
  if (value == null) return '—';
  const n = typeof value === 'number' ? value : parseFloat(String(value));
  if (Number.isNaN(n)) return '—';
  return `${(n * 100).toFixed(0)}%`;
}

function formatTime(value?: string): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleString('id-ID', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return value;
  }
}

export default function MySignalsPage() {
  const { getAuthHeaders } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needSubscription, setNeedSubscription] = useState(false);
  const [source, setSource] = useState<string>('');
  const [tier, setTier] = useState<string>('');

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch('/api/client/signals?limit=50', {
        headers: getAuthHeaders(),
      });
      if (res.status === 403) {
        setNeedSubscription(true);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.json();
      setSignals(Array.isArray(body.items) ? body.items : []);
      setSource(body.source ?? '');
      setTier(body.tier ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
    // Auto-refresh every 30s
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  if (needSubscription) {
    return (
      <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
        <Lock className="h-12 w-12 text-amber-400 mx-auto" />
        <h1 className="text-2xl font-bold">Subscription Required</h1>
        <p className="text-muted-foreground">
          Berlangganan Signal Service untuk mengakses sinyal trading real-time dari bot BabahAlgo.
        </p>
        <div className="flex gap-3 justify-center pt-4">
          <Button asChild>
            <Link href="/pricing">Lihat Paket Berlangganan</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/research">Baca Riset Gratis</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Signals</h1>
          <p className="text-muted-foreground mt-1">
            Sinyal trading real-time dari bot — refresh otomatis tiap 30 detik.
          </p>
          {tier && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 mt-2 rounded font-mono text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20">
              Tier: {tier}
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
          <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {source === 'local-fallback' && (
        <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-200 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Backend signal API tidak tersedia. Menampilkan history lokal.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">
          {error}
        </div>
      )}

      {loading && signals.length === 0 ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}><CardContent className="p-4 animate-pulse">
              <div className="h-4 w-24 bg-white/10 rounded mb-3" />
              <div className="h-5 w-1/3 bg-white/10 rounded mb-2" />
              <div className="h-4 w-2/3 bg-white/10 rounded" />
            </CardContent></Card>
          ))}
        </div>
      ) : signals.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <AlertCircle className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>Belum ada sinyal yang dikirim.</p>
            <p className="text-xs mt-1">Bot scanner aktif — sinyal muncul saat kondisi entry terpenuhi.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {signals.map((s) => {
            const dirIsBuy = s.direction === 'BUY';
            const Icon = dirIsBuy ? TrendingUp : TrendingDown;
            const id = s.sourceId ?? s.id ?? '';
            const entryPrice = s.entryPrice ?? s.entry_price_hint;
            const stopLoss = s.stopLoss ?? s.stop_loss;
            const takeProfit = s.takeProfit ?? s.take_profit;
            const confidence = s.confidence;
            const emittedAt = s.emittedAt ?? s.emitted_at;
            const entryType = s.entryType ?? s.entry_type;

            return (
              <Card key={String(id)} className="hover:border-amber-500/30 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      'shrink-0 w-10 h-10 rounded-full flex items-center justify-center border',
                      dirIsBuy
                        ? 'bg-green-500/10 border-green-500/30 text-green-400'
                        : 'bg-red-500/10 border-red-500/30 text-red-400',
                    )}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-base">{s.pair}</span>
                        <span className={cn(
                          'text-xs font-mono px-1.5 py-0.5 rounded',
                          dirIsBuy ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300',
                        )}>{s.direction}</span>
                        {entryType && (
                          <span className="text-xs text-muted-foreground font-mono">{String(entryType)}</span>
                        )}
                        {confidence != null && (
                          <span className="text-xs text-amber-400 font-mono">conf {formatConfidence(confidence)}</span>
                        )}
                        {s.outcome && s.outcome !== 'PENDING' && (
                          <span className={cn(
                            'text-[10px] uppercase font-mono px-1.5 py-0.5 rounded',
                            s.outcome === 'WIN' ? 'bg-green-500/20 text-green-300' :
                            s.outcome === 'LOSS' ? 'bg-red-500/20 text-red-300' :
                            'bg-slate-500/20 text-slate-300',
                          )}>{s.outcome}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-3 gap-3 text-xs font-mono mt-2">
                        <div>
                          <div className="text-muted-foreground text-[10px] uppercase">Entry</div>
                          <div>{formatPrice(entryPrice)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[10px] uppercase">SL</div>
                          <div className="text-red-300/80">{formatPrice(stopLoss)}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground text-[10px] uppercase">TP</div>
                          <div className="text-green-300/80">{formatPrice(takeProfit)}</div>
                        </div>
                      </div>

                      {s.reasoning && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">{s.reasoning}</p>
                      )}

                      <div className="text-[10px] text-muted-foreground/70 mt-2 font-mono">
                        {formatTime(emittedAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
