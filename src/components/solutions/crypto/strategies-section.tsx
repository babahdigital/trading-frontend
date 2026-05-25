import { Check, TrendingUp } from 'lucide-react';
import type { Locale } from '@/lib/pricing-format';

interface CryptoStrategySpec {
  slug: string;
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
    slug: 'scalping_momentum',
    name: { id: 'Scalping Momentum', en: 'Scalping Momentum' },
    shortName: 'Scalping',
    timeframe: '5M · 15M · 30M',
    market: 'USDT-M Futures',
    tierAccess: { id: 'Semua tier', en: 'All tiers' },
    tagline: {
      id: 'Momentum scalping jangka pendek pada futures',
      en: 'Short-term momentum scalping on futures',
    },
    description: {
      id: 'Strategi scalping high-frequency pada USDT-M Futures. Mendeteksi momentum burst melalui RSI + volume spike confluence, entry pada breakout konfirmasi dengan trailing stop ketat. Bi-directional (long + short) sesuai regime.',
      en: 'High-frequency scalping strategy on USDT-M Futures. Detects momentum bursts via RSI + volume spike confluence, entries on confirmed breakout with tight trailing stop. Bi-directional (long + short) per regime.',
    },
    highlights: {
      id: [
        'Bi-directional · USDT-M Futures',
        'RSI + Volume spike confluence trigger',
        'Trailing stop ketat (ATR-based)',
        'Risk-reward floor 1.5× enforced',
        'Max 3 posisi simultan per pair',
      ],
      en: [
        'Bi-directional · USDT-M Futures',
        'RSI + Volume spike confluence trigger',
        'Tight trailing stop (ATR-based)',
        'Risk-reward floor 1.5× enforced',
        'Max 3 simultaneous positions per pair',
      ],
    },
  },
  {
    slug: 'swing_smc',
    name: { id: 'Swing SMC', en: 'Swing SMC' },
    shortName: 'Swing SMC',
    timeframe: '1H · 4H · 1D',
    market: 'USDT-M Futures',
    tierAccess: { id: 'Active tier ke atas', en: 'Active tier and above' },
    tagline: {
      id: 'Smart Money swing trading pada futures',
      en: 'Smart Money swing trading on futures',
    },
    description: {
      id: 'Swing trading yang memanfaatkan Smart Money Concepts pada USDT-M Futures. Entry pada order block + FVG confluence di timeframe lebih tinggi, hold multi-day. Bi-directional dengan regime filter ketat.',
      en: 'Swing trading leveraging Smart Money Concepts on USDT-M Futures. Entries at order block + FVG confluence on higher timeframes, multi-day hold. Bi-directional with strict regime filter.',
    },
    highlights: {
      id: [
        'Bi-directional · USDT-M Futures',
        'Order block + FVG confluence entry',
        'Multi-day hold horizon',
        'Risk-reward floor 1.8× enforced',
        'Regime filter: skip ranging market',
      ],
      en: [
        'Bi-directional · USDT-M Futures',
        'Order block + FVG confluence entry',
        'Multi-day hold horizon',
        'Risk-reward floor 1.8× enforced',
        'Regime filter: skip ranging market',
      ],
    },
  },
  {
    slug: 'mean_reversion',
    name: { id: 'Mean Reversion', en: 'Mean Reversion' },
    shortName: 'Mean Reversion',
    timeframe: '15M · 1H · 4H',
    market: 'USDT-M Futures',
    tierAccess: { id: 'Pro tier ke atas', en: 'Pro tier and above' },
    tagline: {
      id: 'Range-bound fade pada futures — kembali ke VWAP',
      en: 'Range-bound fade on futures — revert to VWAP',
    },
    description: {
      id: 'Strategi futures yang fade overextension kembali ke VWAP/EMA mean. Aktif saat regime ranging (ADX < 25) dengan Bollinger Band + RSI divergence sebagai trigger. Bi-directional, high win-rate, low R:R.',
      en: 'Futures strategy that fades overextension back to VWAP/EMA mean. Active in ranging regime (ADX < 25) with Bollinger Band + RSI divergence as trigger. Bi-directional, high win-rate, low R:R.',
    },
    highlights: {
      id: [
        'Bi-directional · USDT-M Futures',
        'VWAP + Bollinger Band mean reversion',
        'RSI divergence confirmation',
        'ADX < 25 regime filter (ranging only)',
        'Funding rate bias awareness',
      ],
      en: [
        'Bi-directional · USDT-M Futures',
        'VWAP + Bollinger Band mean reversion',
        'RSI divergence confirmation',
        'ADX < 25 regime filter (ranging only)',
        'Funding rate bias awareness',
      ],
    },
  },
  {
    slug: 'wyckoff_breakout',
    name: { id: 'Wyckoff Breakout', en: 'Wyckoff Breakout' },
    shortName: 'Wyckoff',
    timeframe: '1H · 4H · 1D',
    market: 'USDT-M Futures',
    tierAccess: { id: 'HNWI tier saja', en: 'HNWI tier only' },
    tagline: {
      id: 'Breakout berbasis akumulasi/distribusi Wyckoff pada futures',
      en: 'Wyckoff accumulation/distribution breakout on futures',
    },
    description: {
      id: 'Strategi futures yang mendeteksi fase akumulasi dan distribusi Wyckoff pada timeframe tinggi. Entry saat Spring/UTAD terkonfirmasi dengan volume surge + market structure break. Bi-directional — long dari akumulasi, short dari distribusi.',
      en: 'Futures strategy detecting Wyckoff accumulation and distribution phases on higher timeframes. Entry on confirmed Spring/UTAD with volume surge + market structure break. Bi-directional — long from accumulation, short from distribution.',
    },
    highlights: {
      id: [
        'Bi-directional · USDT-M Futures',
        'Wyckoff phase detection (akumulasi + distribusi)',
        'Spring/UTAD confirmation entry',
        'Volume surge + structure break trigger',
        'Multi-timeframe confluence (1H → 1D)',
      ],
      en: [
        'Bi-directional · USDT-M Futures',
        'Wyckoff phase detection (accumulation + distribution)',
        'Spring/UTAD confirmation entry',
        'Volume surge + structure break trigger',
        'Multi-timeframe confluence (1H → 1D)',
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
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
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
            ? 'Akses strategi gated per tier: Semua tier mendapat Scalping Momentum · Active tier menambah Swing SMC · Pro tier menambah Mean Reversion · HNWI mendapat semua termasuk Wyckoff Breakout. Seluruh eksekusi pada Binance USDT-M Futures.'
            : 'Strategy access gated per tier: All tiers get Scalping Momentum · Active tier adds Swing SMC · Pro tier adds Mean Reversion · HNWI gets all including Wyckoff Breakout. All execution on Binance USDT-M Futures.'}
        </p>
      </div>
    </section>
  );
}
