'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cpu, ChevronLeft, CheckCircle2, Power, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface EnrolledStrategy {
  strategy_name: string;
  market_type: 'spot' | 'futures';
  enabled: boolean;
}

interface ListResponse {
  source?: 'mock' | 'backend';
  tier?: string;
  items?: EnrolledStrategy[];
}

const STRATEGY_DESC: Record<string, string> = {
  scalping_momentum: 'High-frequency M5/M15 entries riding momentum bursts. Default untuk tier Basic.',
  swing_smc: 'Smart Money Concepts swing setups H1/H4 — order block + FVG entries.',
  wyckoff_breakout: 'Akumulasi/distribusi phase detection + spring-then-breakout.',
  spot_dca_trend: 'Trend-following dollar-cost averaging pada spot — pola akumulasi.',
  spot_swing_trend: 'H4 trend-following spot dengan trailing stop discipline.',
  mean_reversion: 'Range-bound futures setups — fade overshoots ke VWAP.',
};

function fmtName(slug: string): string {
  return slug
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function CryptoStrategyPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/crypto/strategy/list', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = (await res.json()) as ListResponse;
        setData(body);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  const items = data?.items ?? [];
  const enabled = items.filter((s) => s.enabled);
  const disabled = items.filter((s) => !s.enabled);
  const isMock = data?.source === 'mock';

  return (
    <div className="space-y-6">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            Strategi Aktif
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            Tier <span className="font-mono text-amber-300">{data?.tier ?? '—'}</span> · strategi diatur operator. Hubungi support kalau mau adjust enrollment.
          </p>
        </div>
        {isMock && (
          <span className="px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
            data preview
          </span>
        )}
      </div>

      {error && <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">{error}</div>}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-36 rounded-md bg-white/5 animate-pulse" />)}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground space-y-3">
            <Cpu className="h-8 w-8 mx-auto opacity-50" />
            <p>Belum ada strategi yang di-enroll untuk tenant Anda.</p>
            <Button asChild variant="outline" size="sm">
              <Link href="/contact?subject=crypto-strategy-enrollment">
                <Mail className="h-4 w-4 mr-2" /> Request enrollment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {enabled.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Aktif ({enabled.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {enabled.map((s) => (
                  <StrategyCard key={s.strategy_name + s.market_type} strategy={s} />
                ))}
              </div>
            </section>
          )}

          {disabled.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                Standby ({disabled.length})
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {disabled.map((s) => (
                  <StrategyCard key={s.strategy_name + s.market_type} strategy={s} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Card className="bg-white/[0.02]">
        <CardContent className="p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-medium text-foreground mb-1">Kenapa saya tidak bisa pilih strategi sendiri?</p>
          <p>
            Per Sprint X+1.2 backend, enrollment strategi pindah ke kontrol operator untuk menjaga konsistensi risk
            framework antar tenant. Yang masih self-serve: leverage override (di /portal/crypto/risk) dan kill switch.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StrategyCard({ strategy }: { strategy: EnrolledStrategy }) {
  const desc = STRATEGY_DESC[strategy.strategy_name] ?? 'Custom strategy enrolled by operator.';
  return (
    <Card className={cn(strategy.enabled ? 'border-green-500/20 bg-green-500/[0.02]' : 'border-white/10')}>
      <CardContent className="p-4 sm:p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight">{fmtName(strategy.strategy_name)}</h3>
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mt-0.5 inline-block">
              {strategy.market_type}
            </span>
          </div>
          {strategy.enabled ? (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-green-500/15 text-green-300 border border-green-500/30">
              <CheckCircle2 className="h-3 w-3" /> Aktif
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-500/15 text-slate-300 border border-slate-500/30">
              <Power className="h-3 w-3" /> Standby
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{desc}</p>
      </CardContent>
    </Card>
  );
}
