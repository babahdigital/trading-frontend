import { Check, TrendingUp } from 'lucide-react';
import type { Locale } from '@/lib/pricing-format';

interface CryptoStrategySpec {
  slug: 'spot_dca' | 'spot_swing' | 'smc_confluence';
  name: { id: string; en: string };
  shortName: string;
  timeframe: string;
  market: string;
  tierAccess: { id: string; en: string };
  tagline: { id: string; en: string };
  description: { id: string; en: string };
  highlights: { id: string[]; en: string[] };
}

const CRYPTO_STRATEGIES: CryptoStrategySpec[] = [
  {
    slug: 'spot_dca',
    name: { id: 'Spot DCA Trend', en: 'Spot DCA Trend' },
    shortName: 'DCA Trend',
    timeframe: '1H · 4H · 1D · 1W',
    market: 'Spot',
    tierAccess: { id: 'Semua tier', en: 'All tiers' },
    tagline: {
      id: 'Dollar-Cost Averaging dengan trend filter',
      en: 'Dollar-Cost Averaging with trend filter',
    },
    description: {
      id: 'Strategi spot-only paling konservatif. Akumulasi posisi long di bull regime saat pullback ke 20-EMA, dengan SMA-200 sebagai konfirmasi tren utama. Long-only, no shorting, no funding bleed.',
      en: 'Most conservative spot-only strategy. Accumulates long positions in bull regime on pullback to 20-EMA, with SMA-200 confirming primary trend. Long-only, no shorting, no funding bleed.',
    },
    highlights: {
      id: [
        'Long-only · bull regime confirmed',
        'Pullback entry ≤1.2× ATR dari 20-EMA',
        'RSI gate: oversold = discount opportunity (post Sprint A4)',
        'Risk-reward floor 1.5× enforced',
        'Multi-TF alignment (Sprint L3): reject kalau HTF bear',
      ],
      en: [
        'Long-only · bull regime confirmed',
        'Pullback entry ≤1.2× ATR from 20-EMA',
        'RSI gate: oversold = discount opportunity (post Sprint A4)',
        'Risk-reward floor 1.5× enforced',
        'Multi-TF alignment (Sprint L3): reject if HTF bear',
      ],
    },
  },
  {
    slug: 'spot_swing',
    name: { id: 'Spot Swing Trend', en: 'Spot Swing Trend' },
    shortName: 'Swing Trend',
    timeframe: '4H · 1D · 1W',
    market: 'Spot',
    tierAccess: { id: 'Active tier ke atas', en: 'Active tier and above' },
    tagline: {
      id: 'Swing trading multi-day dengan MACD + Awesome Oscillator',
      en: 'Multi-day swing trading with MACD + Awesome Oscillator',
    },
    description: {
      id: 'Horizon hold multi-day hingga multi-week. Bull regime longs only, SMA(20/50) value area entry dengan konfirmasi MACD cross / AO saucer. Risk-reward floor 1.8× — quality over quantity.',
      en: 'Multi-day to multi-week hold horizon. Bull regime longs only, SMA(20/50) value area entry with MACD cross / AO saucer confirmation. RR floor 1.8× — quality over quantity.',
    },
    highlights: {
      id: [
        'Hold 4H/1D/1W timeframe',
        'MACD cross + AO saucer confluence',
        'RSI regime alignment (Brown rules)',
        'Risk-reward floor 1.8× enforced',
        'Horizon scaled 2× (zero funding bleed spot)',
      ],
      en: [
        'Hold 4H/1D/1W timeframes',
        'MACD cross + AO saucer confluence',
        'RSI regime alignment (Brown rules)',
        'Risk-reward floor 1.8× enforced',
        'Horizon scaled 2× (zero funding bleed spot)',
      ],
    },
  },
  {
    slug: 'smc_confluence',
    name: { id: 'Smart Money Confluence', en: 'Smart Money Confluence' },
    shortName: 'Smart Money',
    timeframe: '15M · 30M · 1H · 4H · 1D',
    market: 'Spot + Futures',
    tierAccess: { id: 'Pro tier ke atas', en: 'Pro tier and above' },
    tagline: {
      id: 'Flagship institutional — 8-component scoring',
      en: 'Flagship institutional — 8-component scoring',
    },
    description: {
      id: 'Strategi flagship bi-directional (long bull, short bear). Confluence scoring 8 komponen: Regime Alignment, SMC Structure (OB+FVG), Liquidity Sweep, Premium/Discount Zone, CVD Divergence, VWAP, Funding Bias, OI Confluence. Confidence floor 0.50, RR floor 1.8×.',
      en: 'Flagship bi-directional strategy (bull longs, bear shorts). 8-component confluence scoring: Regime Alignment, SMC Structure (OB+FVG), Liquidity Sweep, Premium/Discount Zone, CVD Divergence, VWAP, Funding Bias, OI Confluence. Confidence floor 0.50, RR floor 1.8×.',
    },
    highlights: {
      id: [
        'Bi-directional · spot + futures',
        '8 komponen confluence scoring (regime, OB/FVG, liquidity, P/D, CVD, VWAP, funding, OI)',
        'Hard min stop 0.8% spot / 1.5% futures',
        'Confidence floor 0.50 (sesi rc29)',
        'Range regime skip — anti-whipsaw guard',
      ],
      en: [
        'Bi-directional · spot + futures',
        '8-component confluence scoring (regime, OB/FVG, liquidity, P/D, CVD, VWAP, funding, OI)',
        'Hard min stop 0.8% spot / 1.5% futures',
        'Confidence floor 0.50 (rc29)',
        'Range regime skip — anti-whipsaw guard',
      ],
    },
  },
];

interface StrategiesSectionProps {
  t: (key: string) => string;
  localeKey: Locale;
}

export function StrategiesSection({ t, localeKey }: StrategiesSectionProps) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('strat_eyebrow')}</p>
        <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{t('strat_title')}</h2>
        <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
          {t('strat_subtitle')}
        </p>
        <div className="grid md:grid-cols-3 gap-5">
          {CRYPTO_STRATEGIES.map((s) => (
            <div key={s.slug} className="card-enterprise group">
              <div className="flex items-start justify-between mb-3 gap-2">
                <h3 className="text-base font-semibold leading-snug">{s.name[localeKey]}</h3>
                <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              </div>
              <p className="text-xs text-foreground/55 mb-3 leading-snug italic">{s.tagline[localeKey]}</p>
              <div className="flex flex-wrap items-center gap-1.5 mb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                  {s.timeframe}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                  {s.market}
                </span>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300">
                  {s.tierAccess[localeKey]}
                </span>
              </div>
              <p className="t-body-sm text-foreground/65 leading-relaxed mb-4">{s.description[localeKey]}</p>
              <ul className="space-y-1.5 pt-3 border-t border-border/40">
                {s.highlights[localeKey].map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-foreground/70 leading-snug">
                    <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/50 mt-6 max-w-2xl">
          {localeKey === 'id'
            ? 'Akses strategi gated per tier: Demo + Starter pakai Spot DCA · Active dapat tambah Spot Swing · Pro/HNWI dapat penuh termasuk Smart Money Confluence (futures support).'
            : 'Strategy access gated per tier: Demo + Starter use Spot DCA · Active adds Spot Swing · Pro/HNWI get all including Smart Money Confluence (futures support).'}
        </p>
      </div>
    </section>
  );
}
