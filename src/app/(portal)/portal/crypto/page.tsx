'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  Bitcoin,
  Lock,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  KeyRound,
  Wallet,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertOctagon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CryptoSubscription {
  id: string;
  tier: string;
  status: string;
  apiKeyConnected: boolean;
  apiKeyVerifiedAt: string | null;
  monthlyFeeUsd: number;
  profitSharePct: number;
  activatedAt: string | null;
  expiresAt: string | null;
  nextBillingAt: string | null;
  maxLeverage: number;
  maxPairs: number;
  selectedStrategy: string | null;
}

interface SubscriptionResponse {
  backend_available: boolean;
  subscription: CryptoSubscription | null;
}

interface OverviewResponse {
  source?: 'mock' | 'backend';
  tier?: string;
  tenant_id?: number | string;
  subscription_tier?: string;
  status?: string;
  notification_lang?: 'id' | 'en';
  telegram_bound?: boolean;
  open_positions_count?: number;
  closing_positions_count?: number;
  latest_equity_usdt?: string;
  latest_available_balance?: string;
  latest_equity_recorded_at?: string;
  realized_pnl_24h_usdt?: string;
  trades_24h_count?: number;
  risk_profile_max_leverage?: number;
  risk_profile_risk_per_trade_pct?: string;
  kill_switch_active?: boolean;
}

const TIER_LABEL: Record<string, string> = {
  CRYPTO_BASIC: 'Crypto Basic',
  CRYPTO_PRO: 'Crypto Pro',
  CRYPTO_HNWI: 'Crypto HNWI',
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-300 border-green-500/30',
  PENDING: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  PAUSED: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  SUSPENDED: 'bg-red-500/10 text-red-300 border-red-500/30',
  CANCELLED: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
};

function formatUsd(raw: string | undefined | null): string {
  if (!raw) return '—';
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return '—';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function CryptoOverviewPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const [subRes, ovRes] = await Promise.all([
        fetch('/api/crypto/subscription', { headers: getAuthHeaders() }),
        fetch('/api/crypto/overview', { headers: getAuthHeaders() }).catch(() => null),
      ]);
      if (!subRes.ok) throw new Error(`HTTP ${subRes.status}`);
      const subBody = (await subRes.json()) as SubscriptionResponse;
      setData(subBody);
      if (ovRes && ovRes.ok) {
        setOverview((await ovRes.json()) as OverviewResponse);
      } else {
        setOverview(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="h-32 bg-white/5 rounded animate-pulse" />
        <div className="h-24 bg-white/5 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">
        Gagal memuat status: {error}
      </div>
    );
  }

  const sub = data?.subscription;
  const backendDown = data && !data.backend_available;
  const isMock = overview?.source === 'mock';
  const pnl24 = overview?.realized_pnl_24h_usdt ? parseFloat(overview.realized_pnl_24h_usdt) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bitcoin className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" /> Crypto Bot
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            Bot Binance Futures — SMC + Wyckoff + AI risk overlay, 24/7.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMock && (
            <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
              data preview
            </span>
          )}
          <Button size="sm" variant="outline" onClick={load} disabled={refreshing}>
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} /> Refresh
          </Button>
        </div>
      </div>

      {backendDown && (
        <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-200 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Crypto backend belum aktif di environment ini — data ditampilkan dari mock fallback.
        </div>
      )}

      {overview?.kill_switch_active && (
        <div className="p-3 rounded-md border border-red-500/40 bg-red-500/10 text-red-200 text-sm flex items-center gap-2">
          <AlertOctagon className="h-4 w-4 shrink-0" />
          Kill switch aktif — bot tidak menerima entry baru. Cabut di /portal/crypto/risk untuk lanjutkan trading.
        </div>
      )}

      {!sub ? (
        <Card>
          <CardContent className="p-8 space-y-5 text-center">
            <Lock className="h-12 w-12 text-amber-400 mx-auto" />
            <h2 className="text-2xl font-bold">Belum Berlangganan Crypto Bot</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Hubungkan akun Binance Anda dan biarkan algoritma kami menjalankan strategi institusional di pasar
              kripto 24 jam — tanpa Anda harus monitor sepanjang malam.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto pt-2 text-left">
              {[
                { label: 'Crypto Basic', price: '$49 / bln', features: '3 pair · 5x leverage · 1 strategi' },
                { label: 'Crypto Pro', price: '$199 / bln', features: '8 pair · 10x leverage · 4 strategi' },
                { label: 'Crypto HNWI', price: '$499 / bln', features: '12 pair · 15x leverage · all strategi' },
              ].map((t) => (
                <div key={t.label} className="rounded-lg border border-white/10 p-4 bg-white/5">
                  <div className="text-xs text-amber-400 font-mono uppercase tracking-wider">{t.label}</div>
                  <div className="text-xl font-bold mt-1">{t.price}</div>
                  <div className="text-xs text-muted-foreground mt-2">{t.features}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 justify-center pt-4">
              <Button asChild>
                <Link href="/pricing#crypto">Lihat Paket Lengkap</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/contact">Konsultasi Gratis</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI strip — live data dari overview endpoint */}
          {overview && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    <Wallet className="h-3.5 w-3.5" /> Equity USDT
                  </div>
                  <div className="text-xl font-bold font-mono">{formatUsd(overview.latest_equity_usdt)}</div>
                  <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                    Available: {formatUsd(overview.latest_available_balance)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    {pnl24 >= 0 ? <TrendingUp className="h-3.5 w-3.5 text-green-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
                    PnL 24 Jam
                  </div>
                  <div className={cn('text-xl font-bold font-mono', pnl24 >= 0 ? 'text-green-300' : 'text-red-300')}>
                    {pnl24 >= 0 ? '+' : ''}{formatUsd(overview.realized_pnl_24h_usdt)}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                    {overview.trades_24h_count ?? 0} trade tertutup
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                    <Activity className="h-3.5 w-3.5" /> Open Positions
                  </div>
                  <div className="text-xl font-bold font-mono">{overview.open_positions_count ?? 0}</div>
                  <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                    {overview.closing_positions_count ?? 0} closing
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Risk Status</div>
                  <div className={cn(
                    'text-xl font-bold',
                    overview.kill_switch_active ? 'text-red-300' : 'text-green-300',
                  )}>
                    {overview.kill_switch_active ? 'PAUSED' : 'ACTIVE'}
                  </div>
                  <div className="text-[11px] text-muted-foreground/70 font-mono mt-0.5">
                    Lev {overview.risk_profile_max_leverage ?? sub.maxLeverage}x · {overview.risk_profile_risk_per_trade_pct ?? '1'}% per trade
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Subscription + Binance link cards */}
          <div className="grid lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Tier</div>
                    <div className="text-2xl font-bold mt-1">{TIER_LABEL[sub.tier] ?? sub.tier}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ${sub.monthlyFeeUsd.toFixed(0)} / bulan + {Number(sub.profitSharePct).toFixed(0)}% profit share
                    </div>
                  </div>
                  <span className={cn('text-xs font-mono uppercase px-2 py-1 rounded border', STATUS_TONE[sub.status] ?? STATUS_TONE.PENDING)}>
                    {sub.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Max Leverage</div>
                    <div className="font-mono text-lg">{sub.maxLeverage}x</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Max Pairs</div>
                    <div className="font-mono text-lg">{sub.maxPairs}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Strategi</div>
                    <div className="font-mono text-sm truncate">{sub.selectedStrategy ?? '—'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-muted-foreground">Renewal</div>
                    <div className="font-mono text-sm">
                      {sub.nextBillingAt ? new Date(sub.nextBillingAt).toLocaleDateString('id-ID') : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2">
                  {sub.apiKeyConnected ? (
                    <ShieldCheck className="h-5 w-5 text-green-400" />
                  ) : (
                    <KeyRound className="h-5 w-5 text-amber-400" />
                  )}
                  <span className="font-semibold">Binance Connection</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {sub.apiKeyConnected
                    ? `Terhubung ${sub.apiKeyVerifiedAt ? new Date(sub.apiKeyVerifiedAt).toLocaleString('id-ID') : '—'}.`
                    : 'API key belum disubmit. Hubungkan Binance untuk mengaktifkan bot.'}
                </p>
                {overview?.telegram_bound && (
                  <p className="text-xs text-green-300 font-mono">
                    Telegram: terhubung · lang {overview.notification_lang}
                  </p>
                )}
                <Button asChild variant={sub.apiKeyConnected ? 'outline' : 'default'} className="w-full">
                  <Link href="/portal/crypto/connect">
                    {sub.apiKeyConnected ? 'Update API Key' : 'Hubungkan Binance'}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
