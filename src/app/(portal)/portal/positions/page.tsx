'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('portal.positions');
  const tShared = useTranslations('portal.shared');
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
      if (!res.ok) throw new Error(t('fetch_failed'));
      const data = await res.json();
      setPositions(Array.isArray(data) ? data : data.positions || []);
      setLastUpdated(new Date());
      setError('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : tShared('connection_error'));
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, t, tShared]);

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
        <h1 className="text-2xl font-bold">{t('title')}</h1>
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
            {wsConnected ? tShared('live_label') : tShared('polling_label')}
          </span>
          <span>{t('refresh_label')} {wsConnected ? t('refresh_on_event') : t('refresh_3s')}</span>
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
            <CardTitle className="text-sm font-medium">{t('open_count', { count: positions.length })}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t('floating_pnl_label')}</span>
              <span className={cn('font-mono font-semibold', totalPnl >= 0 ? 'text-green-400' : 'text-red-400')}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground text-sm">{tShared('loading')}</p>
            ) : positions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">{t('empty')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_pair')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_direction')}</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">{t('table_pnl_usd')}</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">{t('table_pnl_pips')}</th>
                      <th className="pb-3 font-medium text-muted-foreground text-right">{t('table_duration')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_strategy')}</th>
                      <th className="pb-3 font-medium text-muted-foreground">{t('table_status')}</th>
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
                          {pos.duration_seconds ? t('duration_minutes', { minutes: Math.floor(pos.duration_seconds / 60) }) : '-'}
                        </td>
                        <td className="py-3 text-xs text-muted-foreground">{genericSetup(pos.setup)}</td>
                        <td className="py-3">
                          <span className={cn('px-2 py-0.5 rounded text-xs',
                            pos.status === 'holding' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                          )}>
                            {pos.status === 'holding' ? t('status_holding') : pos.status || t('status_active')}
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
          <p className="text-muted-foreground text-sm">{tShared('loading')}</p>
        ) : positions.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">{t('empty')}</CardContent>
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
                    <div>{t('mobile_duration_label')} {pos.duration_seconds ? t('duration_minutes', { minutes: Math.floor(pos.duration_seconds / 60) }) : '-'}</div>
                    <div>{t('mobile_strategy_label')} {genericSetup(pos.setup)}</div>
                    <div>{t('mobile_status_label')} {pos.status || t('status_active')}</div>
                    {pos.pnl_pips !== undefined && <div>{t('mobile_pips_label')} {pos.pnl_pips >= 0 ? '+' : ''}{pos.pnl_pips}</div>}
                  </div>
                </CardContent>
              </Card>
            ))}
            <Card>
              <CardContent className="py-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{t('total_floating_pnl')}</span>
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
