'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cpu, Lock, ChevronLeft, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface Strategy {
  name: string;
  display_name: string;
  description: string;
  min_tier: 'CRYPTO_BASIC' | 'CRYPTO_PRO' | 'CRYPTO_HNWI';
  market_types: ('spot' | 'futures')[];
  default_params: Record<string, unknown>;
  available?: boolean;
}

const TIER_BADGE: Record<string, string> = {
  CRYPTO_BASIC: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  CRYPTO_PRO: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  CRYPTO_HNWI: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
};

const TIER_RANK: Record<string, number> = { CRYPTO_BASIC: 1, CRYPTO_PRO: 2, CRYPTO_HNWI: 3 };

export default function CryptoStrategyPage() {
  const { getAuthHeaders } = useAuth();
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [tier, setTier] = useState<string>('');
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [source, setSource] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/crypto/strategy/list', { headers: getAuthHeaders() });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body = await res.json();
        setStrategies(body.items ?? []);
        setTier(body.tier ?? '');
        setSource(body.source ?? '');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'unknown error');
      } finally {
        setLoading(false);
      }
    })();
  }, [getAuthHeaders]);

  async function activate() {
    if (!selected) return;
    setSubmitting(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/crypto/strategy/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ strategy_name: selected, enabled: true }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setSubmitting(false);
    }
  }

  const userRank = TIER_RANK[tier] ?? 1;

  return (
    <div className="space-y-6">
      <Link href="/portal/crypto" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Kembali
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-3">
            <Cpu className="h-6 w-6 sm:h-7 sm:w-7 text-amber-400" />
            Pilih Strategi Trading
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm sm:text-base">
            Tier Anda: <span className="font-mono text-amber-300">{tier || '—'}</span>. Strategi yang terkunci membutuhkan upgrade tier.
          </p>
        </div>
        {source === 'mock' && (
          <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono bg-amber-500/10 border border-amber-500/30 text-amber-300">
            data preview
          </span>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-md border border-red-500/30 bg-red-500/5 text-red-300 text-sm">{error}</div>
      )}
      {success && (
        <div className="p-3 rounded-md border border-green-500/30 bg-green-500/5 text-green-300 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> Strategi tersimpan dan akan aktif pada bar berikutnya.
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-44 rounded-md bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {strategies.map((s) => {
            const locked = (TIER_RANK[s.min_tier] ?? 1) > userRank;
            const isSelected = selected === s.name;
            return (
              <button
                key={s.name}
                type="button"
                disabled={locked}
                onClick={() => !locked && setSelected(s.name)}
                className={cn(
                  'relative text-left rounded-lg border p-5 transition-all',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  locked
                    ? 'border-white/10 bg-white/[0.02] opacity-60 cursor-not-allowed'
                    : isSelected
                      ? 'border-amber-500/50 bg-amber-500/5 ring-2 ring-amber-500/30'
                      : 'border-white/10 bg-card hover:border-amber-500/30 hover:bg-amber-500/[0.03]',
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-base">{s.display_name}</h3>
                  {locked ? (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : isSelected ? (
                    <CheckCircle2 className="h-5 w-5 text-amber-400 shrink-0" />
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{s.description}</p>
                <div className="flex flex-wrap gap-1.5 text-[10px] font-mono uppercase">
                  <span className={cn('px-1.5 py-0.5 rounded border', TIER_BADGE[s.min_tier])}>
                    min {s.min_tier.replace('CRYPTO_', '')}
                  </span>
                  {s.market_types.map((m) => (
                    <span key={m} className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-muted-foreground">
                      {m}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="sticky bottom-4 z-10">
          <Card className="border-amber-500/30 bg-card/95 backdrop-blur shadow-lg">
            <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Akan diaktifkan</p>
                <p className="font-semibold mt-0.5">
                  {strategies.find((s) => s.name === selected)?.display_name ?? selected}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <Button variant="outline" size="sm" onClick={() => setSelected('')} className="flex-1 sm:flex-none">
                  Batal
                </Button>
                <Button size="sm" onClick={activate} disabled={submitting} className="flex-1 sm:flex-none">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Aktifkan Strategi'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
