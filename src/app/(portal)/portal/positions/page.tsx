'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth/auth-context';
import { useBabahalgoWS } from '@/lib/api/use-websocket';
import { strategyDisplayName, isStrategyObfuscationEnabled } from '@/lib/trading/strategy-names';

interface Position {
  symbol: string;
  direction: string;
  pnl_usd: number;
  pnl_pips?: number;
  duration_seconds?: number;
  setup?: string;
  status?: string;
}

function genericSetup(setup?: string): string {
  return strategyDisplayName(setup, isStrategyObfuscationEnabled());
}

// Polling cadence: backstop for WS gaps. Slowed when WS connected to halve API load.
const POLL_FAST_MS = 3000;
const POLL_SLOW_MS = 15000;

export default function PositionsPage() {
  const { getAuthHeaders, getAccessToken } = useAuth();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    setToken(getAccessToken());
  }, [getAccessToken]);

  const { connected: wsConnected, subscribe, on } = useBabahalgoWS({ token });

  const fetchPositions = useCallback(async (): Promise<void> => {
    try {
      const res = await fetch('/api/client/positions', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to fetch positions');
      const data = await res.json();
      setPositions(Array.isArray(data) ? data : data.positions || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    void fetchPositions();
    const cadence = wsConnected ? POLL_SLOW_MS : POLL_FAST_MS;
    const interval = setInterval(() => { void fetchPositions(); }, cadence);
    return () => clearInterval(interval);
  }, [fetchPositions, wsConnected]);

  // Live position update: any WS event triggers immediate refetch (server is canonical source).
  useEffect(() => {
    const offUpdate = on('position.update', () => { void fetchPositions(); });
    const offKill = on('kill_switch', () => { void fetchPositions(); });
    const unsubPos = subscribe({ type: 'position.update' });
    const unsubKill = subscribe({ type: 'kill_switch' });
    return () => {
      offUpdate();
      offKill();
      unsubPos();
      unsubKill();
    };
  }, [on, subscribe, fetchPositions]);

  const totalPnl = positions.reduce((sum, p) => sum + (p.pnl_usd || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold">Posisi Terbuka</h1>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full font-mono uppercase tracking-wider text-[10px]',
              wsConnected
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                : 'bg-muted/40 text-muted-foreground border border-border',
            )}
            aria-live="polite"
          >
            <span
              className={cn('w-1.5 h-1.5 rounded-full', wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/40')}
              aria-hidden
            />
            {wsConnected ? 'Live' : 'Polling'}
          </span>
          <span>Refresh: {wsConnected ? 'on event' : '3s'}</span>
          {lastUpdated && (
            <span>{lastUpdated.toLocaleTimeString()}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{error}</div>
      )}

      {/* Desktop Table */}
      <div className="hidden md:block">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Open Positions ({positions.length})</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Floating PnL:</span>
              <span className={cn('font-mono font-semibold', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : positions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">Tidak ada posisi terbuka</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">Pair</th>
                      <th className="pb-3 font-medium text-muted-foreground">Arah</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">PnL ($)</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">PnL (pips)</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">Durasi</th>
                      <th className="pb-3 font-medium text-muted-foreground">Strategi</th>
                      <th className="pb-3 font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positions.map((pos, i) => (
                      <tr key={i} className={cn('border-b border-border/50 last:border-0 transition-colors',
                        pos.pnl_usd >= 0 ? 'hover:bg-green-500/5' : 'hover:bg-red-500/5'
                      )}>
                        <td className="py-3 font-mono font-semibold">{pos.symbol}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
                            pos.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          )}>{pos.direction}</span>
                        </td>
                        <td className={cn('py-3 text-right font-mono font-semibold', pos.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {pos.pnl_usd >= 0 ? '+' : ''}${pos.pnl_usd?.toFixed(2)}
                        </td>
                        <td className={cn('py-3 text-right font-mono', (pos.pnl_pips || 0) >= 0 ? 'text-green-400' : 'text-red-400')}>
                          {pos.pnl_pips !== undefined ? `${pos.pnl_pips >= 0 ? '+' : ''}${pos.pnl_pips}` : '-'}
                        </td>
                        <td className="py-3 text-right font-mono text-xs text-muted-foreground">
                          {pos.duration_seconds ? `${Math.floor(pos.duration_seconds / 60)} menit` : '-'}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{genericSetup(pos.setup)}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs',
                            pos.status === 'holding' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          )}>
                            {pos.status === 'holding' ? 'Holding' : pos.status || 'Active'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading...</p>
        ) : positions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">Tidak ada posisi terbuka</CardContent>
          </Card>
        ) : (
          <>
            {positions.map((pos, i) => (
              <Card key={i} className={cn('border-l-4',
                pos.pnl_usd >= 0 ? 'border-l-green-500' : 'border-l-red-500'
              )}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{pos.symbol}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-xs',
                        pos.direction === 'BUY' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      )}>{pos.direction}</span>
                    </div>
                    <span className={cn('font-mono font-bold',
                      pos.pnl_usd >= 0 ? 'text-green-400' : 'text-red-400'
                    )}>
                      {pos.pnl_usd >= 0 ? '+' : ''}${pos.pnl_usd?.toFixed(2)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div>Durasi: {pos.duration_seconds ? `${Math.floor(pos.duration_seconds / 60)} menit` : '-'}</div>
                    <div>Strategi: {genericSetup(pos.setup)}</div>
                    <div>Status: {pos.status || 'Active'}</div>
                    {pos.pnl_pips !== undefined && <div>Pips: {pos.pnl_pips >= 0 ? '+' : ''}{pos.pnl_pips}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Floating PnL</span>
                <span className={cn('font-mono font-bold', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                  {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                </span>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
