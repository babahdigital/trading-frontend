'use client';

/**
 * Shared live stats bar — pulls real KPI dari /api/public/performance
 * (master tenant portfolio). NEVER halusinasi: kalau backend kosong /
 * KPI '—', komponen self-hide dengan returning null.
 *
 * 4 metrics: Total Return · Win Rate · Profit Factor · Max Drawdown.
 * Auto-refresh 30 menit (server-side cache TTL match).
 *
 * i18n namespace defaultnya `register` untuk backward-compat. Surface
 * lain bisa override via prop `namespace`.
 */
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TrendingUp, Target, Activity, ShieldAlert } from 'lucide-react';

interface KPI {
  totalReturn: string;
  winRate: string;
  profitFactor: string;
  maxDrawdown: string;
}

interface StatsResponse {
  source: 'cache' | 'backend' | 'local' | 'empty';
  kpi: KPI;
}

function isMeaningful(kpi: KPI): boolean {
  return kpi.totalReturn !== '—' || kpi.winRate !== '—';
}

export function StatsBar({ namespace = 'register' }: { namespace?: string }) {
  const t = useTranslations(namespace);
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/performance', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: StatsResponse | null) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border/40 bg-card/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || !isMeaningful(data.kpi)) {
    return null;
  }

  const items = [
    { icon: TrendingUp, value: data.kpi.totalReturn, labelKey: 'stats_total_return', positive: data.kpi.totalReturn.startsWith('+') },
    { icon: Target, value: data.kpi.winRate, labelKey: 'stats_win_rate' },
    { icon: Activity, value: data.kpi.profitFactor, labelKey: 'stats_profit_factor' },
    { icon: ShieldAlert, value: data.kpi.maxDrawdown, labelKey: 'stats_max_drawdown', negative: true },
  ];

  return (
    <section aria-label={t('stats_eyebrow')} className="my-10">
      <p className="t-eyebrow eyebrow-rule mb-4 text-center">{t('stats_eyebrow')}</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map(({ icon: Icon, value, labelKey, positive, negative }) => (
          <div
            key={labelKey}
            className="rounded-lg border border-border/60 bg-card/60 px-4 py-5 text-center"
          >
            <Icon
              className={`w-4 h-4 mx-auto mb-2 ${
                positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-amber-400'
              }`}
              aria-hidden
            />
            <div
              className={`font-mono text-xl sm:text-2xl font-semibold tabular-nums tracking-tight ${
                positive ? 'text-emerald-400' : negative ? 'text-rose-400' : 'text-foreground'
              }`}
            >
              {value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-foreground/50 font-medium mt-1">
              {t(labelKey)}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-foreground/40 text-center mt-3 max-w-2xl mx-auto leading-relaxed">
        {t('stats_footnote')}
      </p>
    </section>
  );
}
