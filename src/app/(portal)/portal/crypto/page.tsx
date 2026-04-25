'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bitcoin, Lock, ShieldCheck, AlertTriangle, RefreshCw, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

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

export default function CryptoOverviewPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<SubscriptionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const res = await fetch('/api/crypto/subscription', { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as SubscriptionResponse;
      setData(body);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-8 w-1/3 bg-white/10 rounded animate-pulse" />
        <div className="h-32 bg-white/5 rounded animate-pulse" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bitcoin className="h-7 w-7 text-amber-400" /> Crypto Bot
          </h1>
          <p className="text-muted-foreground mt-1">
            Bot trading Binance Futures — SMC + Wyckoff + AI risk overlay, 24/7.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {backendDown && (
        <div className="p-3 rounded-md border border-amber-500/30 bg-amber-500/5 text-amber-200 text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          Crypto backend belum aktif di environment ini — fitur trading hidup setelah ops menyalakan worker.
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
                { label: 'Crypto Basic', price: '$99 / bln', features: '3 pair, leverage 10x' },
                { label: 'Crypto Pro', price: '$249 / bln', features: '10 pair, leverage 20x' },
                { label: 'Crypto HNWI', price: '$599 / bln', features: 'unlimited + dedicated mgr' },
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
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Tier</div>
                  <div className="text-2xl font-bold mt-1">{TIER_LABEL[sub.tier] ?? sub.tier}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    ${sub.monthlyFeeUsd.toFixed(0)} / bulan + {Number(sub.profitSharePct).toFixed(0)}% profit share
                  </div>
                </div>
                <span className={`text-xs font-mono uppercase px-2 py-1 rounded border ${STATUS_TONE[sub.status] ?? STATUS_TONE.PENDING}`}>
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
                  <div className="font-mono text-sm">{sub.selectedStrategy ?? '—'}</div>
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
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2">
                {sub.apiKeyConnected ? (
                  <ShieldCheck className="h-5 w-5 text-green-400" />
                ) : (
                  <KeyRound className="h-5 w-5 text-amber-400" />
                )}
                <span className="font-semibold">Binance Connection</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {sub.apiKeyConnected
                  ? `Terhubung pada ${sub.apiKeyVerifiedAt ? new Date(sub.apiKeyVerifiedAt).toLocaleString('id-ID') : '—'}.`
                  : 'API key belum disubmit. Hubungkan Binance untuk mengaktifkan bot.'}
              </p>
              <Button asChild variant={sub.apiKeyConnected ? 'outline' : 'default'} className="w-full">
                <Link href="/portal/crypto/connect">
                  {sub.apiKeyConnected ? 'Update API Key' : 'Hubungkan Binance'}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
