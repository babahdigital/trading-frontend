'use client';

import { useEffect, useState } from 'react';
import { Check, Lock, Loader2, BarChart3, Target, Brain } from 'lucide-react';
import { type CapabilityTier, tierLabel, tierIncludes, CAPABILITY_TIER_ORDER } from '@/lib/capabilities/tier-mapping';
import { cn } from '@/lib/utils';

interface CapabilityItem {
  name: string;
  category: 'indicator' | 'strategy' | 'ai_subsystem';
  available_in_tier: CapabilityTier;
  description: string;
}

interface CapabilitiesResponse {
  source?: 'cache' | 'backend' | 'fallback';
  tiers: CapabilityTier[];
  indicators: CapabilityItem[];
  strategies: CapabilityItem[];
  ai_subsystems: CapabilityItem[];
}

type Bucket = 'indicators' | 'strategies' | 'ai_subsystems';

const SECTION_META: Record<Bucket, { label: string; icon: typeof BarChart3; description: string }> = {
  indicators: {
    label: 'Indicators',
    icon: BarChart3,
    description: 'Technical indicator yang tersedia di setiap tier — SMC, Wyckoff, dan Astronacci adalah keunggulan kami.',
  },
  strategies: {
    label: 'Strategies',
    icon: Target,
    description: 'Strategi trading otomatis yang berjalan di backend — semakin tinggi tier, semakin banyak strategi paralel.',
  },
  ai_subsystems: {
    label: 'AI Subsystems',
    icon: Brain,
    description: 'Layer AI eksplikabilitas + entry advisor + retrospective. Aktif sejak Pro, lengkap di VIP.',
  },
};

export function CapabilityLadder() {
  const [data, setData] = useState<CapabilitiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeBucket, setActiveBucket] = useState<Bucket>('indicators');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/capabilities')
      .then((r) => (r.ok ? r.json() : null))
      .then((body: CapabilitiesResponse | null) => {
        if (!cancelled && body) setData(body);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const tiers: CapabilityTier[] = data?.tiers ?? CAPABILITY_TIER_ORDER.slice();
  const items = data?.[activeBucket] ?? [];
  const meta = SECTION_META[activeBucket];

  return (
    <section className="section-padding border-b border-border/60">
      <div className="container-default px-4 sm:px-6">
        <p className="t-eyebrow mb-3">Capability Matrix</p>
        <h2 className="t-display-section mb-3 max-w-2xl">Apa yang Anda dapat di setiap tier</h2>
        <p className="t-body text-foreground/60 max-w-2xl mb-8">
          Daftar fitur live dari backend trading kami. Tier rendah dapat semua fitur tier yang lebih rendah otomatis — kumulatif.
        </p>

        {/* Tab switcher */}
        <div className="inline-flex rounded-md border border-border bg-card p-0.5 text-xs mb-6 flex-wrap">
          {(Object.keys(SECTION_META) as Bucket[]).map((b) => {
            const m = SECTION_META[b];
            const Icon = m.icon;
            const count = data?.[b]?.length ?? 0;
            return (
              <button
                key={b}
                type="button"
                onClick={() => setActiveBucket(b)}
                className={cn(
                  'px-3 py-1.5 rounded font-mono uppercase transition-colors flex items-center gap-1.5',
                  activeBucket === b ? 'bg-amber-500/15 text-amber-300' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {m.label}
                <span className="ml-0.5 text-[10px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground/80 mb-6 max-w-2xl">{meta.description}</p>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm font-mono">Memuat catalog…</span>
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground text-sm">
            Catalog sedang tidak tersedia. Hubungi kami via /contact untuk daftar lengkap.
          </div>
        ) : (
          <>
            {/* Desktop table (md+) */}
            <div className="hidden md:block overflow-x-auto rounded-lg border border-border bg-card">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-border bg-white/[0.02]">
                    <th className="text-left px-4 py-3 font-mono uppercase tracking-wider text-[10px] text-muted-foreground">
                      Feature
                    </th>
                    {tiers.map((t) => (
                      <th
                        key={t}
                        className={cn(
                          'px-3 py-3 font-mono uppercase tracking-wider text-[10px] text-center',
                          t === 'pro' ? 'text-amber-300 bg-amber-500/[0.03]' : 'text-muted-foreground',
                        )}
                      >
                        {tierLabel(t)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr
                      key={it.name}
                      className={cn('border-b border-border/40 last:border-b-0', i % 2 === 0 && 'bg-white/[0.01]')}
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-medium text-foreground/90 text-xs">{it.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug max-w-[280px]">
                          {it.description}
                        </div>
                      </td>
                      {tiers.map((t) => {
                        const included = tierIncludes(t, it.available_in_tier);
                        const isFirstAt = t === it.available_in_tier;
                        return (
                          <td
                            key={t}
                            className={cn(
                              'px-3 py-3 text-center',
                              t === 'pro' && 'bg-amber-500/[0.03]',
                            )}
                          >
                            {included ? (
                              <span
                                className={cn(
                                  'inline-flex items-center justify-center w-5 h-5 rounded-full',
                                  isFirstAt ? 'bg-amber-500/20 text-amber-300' : 'text-emerald-400',
                                )}
                                aria-label={`Tersedia di ${tierLabel(t)}`}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center justify-center w-5 h-5 text-muted-foreground/40"
                                aria-label={`Tidak tersedia di ${tierLabel(t)}`}
                              >
                                <Lock className="h-3 w-3" />
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile card stack (<md) */}
            <ul className="md:hidden space-y-3" aria-label="Feature availability per tier">
              {items.map((it) => {
                const firstTier = it.available_in_tier;
                return (
                  <li
                    key={it.name}
                    className="rounded-lg border border-border bg-card p-3.5"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="min-w-0">
                        <div className="font-mono font-medium text-foreground/90 text-xs break-words">
                          {it.name}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-1 leading-snug">
                          {it.description}
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono uppercase tracking-wider">
                        from {tierLabel(firstTier)}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {tiers.map((t) => {
                        const included = tierIncludes(t, it.available_in_tier);
                        return (
                          <span
                            key={t}
                            className={cn(
                              'inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-mono uppercase tracking-wider border',
                              included
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                : 'border-border bg-white/[0.02] text-muted-foreground/50',
                            )}
                            aria-label={`${tierLabel(t)}: ${included ? 'tersedia' : 'tidak tersedia'}`}
                          >
                            {included ? (
                              <Check className="h-3 w-3" aria-hidden />
                            ) : (
                              <Lock className="h-2.5 w-2.5" aria-hidden />
                            )}
                            {tierLabel(t)}
                          </span>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        <p className="text-[11px] text-muted-foreground/70 mt-4 font-mono">
          Source: {data?.source ?? 'loading'} · {data ? new Date().toLocaleDateString('id-ID') : '—'}
        </p>
      </div>
    </section>
  );
}
