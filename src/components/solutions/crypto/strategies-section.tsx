import { Check, TrendingUp } from 'lucide-react';
import type { CryptoStrategy } from '@/lib/trading/trading-settings';

interface StrategiesSectionProps {
  t: (key: string) => string;
  ts: (key: string) => string;
  strategies: CryptoStrategy[];
}

export function StrategiesSection({ t, ts, strategies }: StrategiesSectionProps) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('strat_eyebrow')}</p>
        <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{t('strat_title')}</h2>
        <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
          {t('strat_subtitle')}
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {strategies.map((s) => {
            const highlights = [1, 2, 3, 4, 5].map((n) => ts(`cs_${s.slug}_h${n}`));
            return (
              <div key={s.slug} className="card-enterprise group">
                <div className="flex items-start justify-between mb-3 gap-2">
                  <h3 className="text-base font-semibold leading-snug">{s.name}</h3>
                  <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                </div>
                <p className="text-xs text-foreground/55 mb-3 leading-snug italic">{ts(`cs_${s.slug}_tagline`)}</p>
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                    {s.timeframe}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                    USDT-M Futures
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                    {ts(`cs_${s.slug}_tier`)}
                  </span>
                </div>
                <p className="t-body-sm text-foreground/65 leading-relaxed mb-4">{ts(`cs_${s.slug}_desc`)}</p>
                <ul className="space-y-1.5 pt-3 border-t border-border/40">
                  {highlights.map((h, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70 leading-snug">
                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-foreground/50 mt-6 max-w-2xl">
          {ts('cs_access_note')}
        </p>
      </div>
    </section>
  );
}
