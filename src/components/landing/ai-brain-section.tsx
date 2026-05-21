'use client';

import { useTranslations } from 'next-intl';
import { Sigma, GitBranch, Calculator, Compass, Filter, Wand2, Scale } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Adaptive Math Engine section — public-facing display untuk 6 modul
 * matematis & statistik yang menjalankan setiap eksekusi.
 *
 * Repositioning 2026-05-21: dulunya branded "AI Brain", sekarang positioned
 * sebagai deterministic decision engine — Math = production, AI = marketing.
 * Setiap modul rule-based + traceable di SQL, BUKAN model AI black-box.
 *
 * Modul:
 *   1. Strategy Router       — Thompson Sampling statistik per regime
 *   2. Kelly Sizing          — formula matematis John Kelly (1956)
 *   3. Markov TP             — exit timing via state transition matrix
 *   4. Pre-trade Filter      — historical winrate per setup (statistik)
 *   5. Adaptive Stop Engine  — ATR + time-decay rule deterministic
 *   6. Isotonic Calibration  — confidence kalibrasi via scipy isotonic regression
 *
 * AI advisor adalah layer informational TERPISAH (chat, riset, daily brief),
 * bukan bagian dari path eksekusi order.
 */

interface BrainModule {
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
}

const MODULES: BrainModule[] = [
  { icon: GitBranch, titleKey: 'mod_bandit_title', descKey: 'mod_bandit_desc' },
  { icon: Calculator, titleKey: 'mod_kelly_title', descKey: 'mod_kelly_desc' },
  { icon: Compass, titleKey: 'mod_markov_title', descKey: 'mod_markov_desc' },
  { icon: Filter, titleKey: 'mod_winprob_title', descKey: 'mod_winprob_desc' },
  { icon: Wand2, titleKey: 'mod_adaptive_title', descKey: 'mod_adaptive_desc' },
  { icon: Scale, titleKey: 'mod_isotonic_title', descKey: 'mod_isotonic_desc' },
];

export function AiBrainSection() {
  const t = useTranslations('landing.ai_brain');

  return (
    <section className="section-padding border-b border-border/60 relative overflow-hidden">
      <div className="absolute inset-0 page-stamp-rule opacity-50 pointer-events-none" />

      <div className="layout-container relative">
        <div className="max-w-3xl mb-10 sm:mb-12">
          <p className="t-eyebrow mb-3 inline-flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <Sigma className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
            {t('eyebrow')}
          </p>
          <h2 className="t-display-section text-foreground leading-tight mb-4">{t('title')}</h2>
          <p className="t-lead text-muted-foreground">{t('lead')}</p>
          <p className="text-xs text-foreground/50 italic mt-3">{t('disclaimer')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {MODULES.map((m) => {
            const Icon = m.icon;
            return (
              <div
                key={m.titleKey}
                className="card-enterprise group"
              >
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 mb-4">
                  <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
                </div>
                <h3 className="font-display text-lg text-foreground mb-2 leading-snug">{t(m.titleKey)}</h3>
                <p className="t-body-sm text-muted-foreground leading-relaxed">{t(m.descKey)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
