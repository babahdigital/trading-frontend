/**
 * SINGLE SOURCE OF TRUTH — All trading product information.
 *
 * Every component, page, chat skill, and API that displays trading info
 * MUST import from this file. When strategies, pairs, tiers, or stats
 * change, update HERE ONLY — everything else follows.
 *
 * Last verified: 2026-05-25 against live backend data from Abdullah.
 */

// ─── FOREX (Robot Meta) ───

export const FOREX_STRATEGIES = [
  {
    slug: 'smc',
    name: 'SMC Scalper',
    variants: ['qm_perfect_adx', 'qm_perfect_ao', 'qm_perfect_full', 'qm_perfect_full_m30', 'qm_perfect_full_m5', 'qm_perfect_pure'],
    timeframe: 'M5 — H4',
    status: 'live' as const,
    desc_id: 'Keluarga Quasimodo pattern (QM + ADX / QM + AO / QM Full Confluence) — scalper institusional multi-timeframe.',
    desc_en: 'Quasimodo pattern family (QM + ADX / QM + AO / QM Full Confluence) — institutional multi-timeframe scalper.',
  },
  {
    slug: 'smc-swing',
    name: 'SMC Swing',
    variants: ['swing_qm_perfect_pure', 'swing_qm_perfect_ao', 'swing_qm_perfect_adx', 'swing_qm_perfect_full'],
    timeframe: 'H1 — H4',
    status: 'live' as const,
    desc_id: 'Smart Money positioning multi-hari di timeframe H1-H4. Hold 4-24 jam, kadang multi-hari.',
    desc_en: 'Multi-day Smart Money positioning on H1-H4 timeframes. Hold 4-24 hours, sometimes multi-day.',
  },
  {
    slug: 'pivot-mean-reversion',
    name: 'Pivot Mean Reversion',
    variants: ['pivot_mean_reversion'],
    timeframe: 'M5 — M30',
    status: 'live' as const,
    desc_id: 'Fade balik ke daily pivot saat harga overextended ke R1/R2 atau S1/S2. Cocok untuk market ranging.',
    desc_en: 'Fade back to daily pivot when price overextends to R1/R2 or S1/S2. Suited for ranging markets.',
  },
  {
    slug: 'quad-confluence',
    name: 'Quad Confluence',
    variants: ['quad_confluence', 'amd_fvg', 'amd_fvg_adx', 'amd_fvg_full', 'amd_fvg_pure'],
    timeframe: 'M5 — M30',
    status: 'new' as const,
    desc_id: 'AMD (Accumulation-Manipulation-Distribution) + Fair Value Gap multi-faktor konvergensi. 4 layer konfluensi.',
    desc_en: 'AMD (Accumulation-Manipulation-Distribution) + Fair Value Gap multi-factor convergence. 4-layer confluence.',
  },
] as const;

export const FOREX_STRATEGY_COUNT = FOREX_STRATEGIES.length; // 4

export const FOREX_PAIRS_LIVE = [
  'XAUUSD', 'GBPUSD', 'XAGUSD', 'GBPJPY', 'USDJPY', 'USOIL', 'EURAUD',
] as const;

export const FOREX_PAIRS_SHADOW = [
  'EURUSD', 'AUDUSD', 'NZDUSD', 'USDCAD', 'USDCHF', 'EURGBP', 'EURJPY', 'AUDJPY', 'BTCUSD', 'ETHUSD', 'UKOIL', 'XNGUSD',
] as const;

export const FOREX_LIFETIME_STATS = {
  trades: 411,
  pnl: -140.66,
  winRate: 43.1,
} as const;

export const FOREX_EXECUTION_MODEL = {
  type: 'deterministic' as const,
  hasAI: false,
  engine: 'Rule-based decision engine',
  components: [
    'Thompson Sampling strategy router',
    'Fixed-fractional position sizing (1-2% risk)',
    'Multi-layer exit (trailing + time-based + breakeven + partial TP)',
    'ATR-based adaptive stop',
  ],
  disclaimer_id: 'Seluruh eksekusi 100% deterministik — rule-based, reproducible, tanpa komponen AI dalam keputusan trading.',
  disclaimer_en: 'All execution is 100% deterministic — rule-based, reproducible, with no AI component in trading decisions.',
};

// ─── CRYPTO (Robot Crypto) ───

export const CRYPTO_STRATEGIES = [
  { slug: 'scalping_momentum', name: 'Scalping Momentum', tier: 'all', timeframe: '5M · 15M · 30M' },
  { slug: 'swing_smc', name: 'Swing SMC', tier: 'active+', timeframe: '1H · 4H · 1D' },
  { slug: 'mean_reversion', name: 'Mean Reversion', tier: 'pro+', timeframe: '15M · 1H · 4H' },
  { slug: 'wyckoff_breakout', name: 'Wyckoff Breakout', tier: 'hnwi', timeframe: '1H · 4H · 1D' },
] as const;

export const CRYPTO_STRATEGY_COUNT = CRYPTO_STRATEGIES.length; // 4

export const CRYPTO_MARKET = 'USDT-M Futures' as const;
export const CRYPTO_EXCHANGE = 'Binance' as const;
export const CRYPTO_HAS_SPOT = false;
/** Paper-trading demo wallet size (USDT). Single source — was hardcoded in the crypto tier matrix. (P2-DI-7) */
export const CRYPTO_DEMO_WALLET_USD = 5000;

export const CRYPTO_TIERS = [
  { slug: 'demo', name: 'Demo', price_usd: 0, price_idr: 0, slots: 1, leverage: 2, risk_pct: 0.5, strategies: ['scalping_momentum'] },
  { slug: 'starter', name: 'Starter', price_usd: 9, price_idr: 149_000, slots: 2, leverage: 3, risk_pct: 1.0, strategies: ['scalping_momentum'] },
  { slug: 'active', name: 'Active', price_usd: 19, price_idr: 299_000, slots: 3, leverage: 7, risk_pct: 1.25, strategies: ['scalping_momentum', 'swing_smc'] },
  { slug: 'pro', name: 'Pro', price_usd: 49, price_idr: 799_000, slots: 5, leverage: 12, risk_pct: 1.5, strategies: ['scalping_momentum', 'swing_smc', 'mean_reversion'], popular: true },
  { slug: 'hnwi', name: 'HNWI', price_usd: 199, price_idr: 3_290_000, slots: 7, leverage: 20, risk_pct: 2.0, strategies: ['scalping_momentum', 'swing_smc', 'mean_reversion', 'wyckoff_breakout'] },
] as const;

// ─── SHARED ───

export const PRODUCT_NAMES = {
  forex: 'Robot Meta',
  crypto: 'Robot Crypto',
} as const;

export function getStrategyListLabel(locale: 'id' | 'en'): string {
  const names = FOREX_STRATEGIES.map(s => s.name).join(' + ');
  return locale === 'id'
    ? `${FOREX_STRATEGY_COUNT} strategi: ${names}`
    : `${FOREX_STRATEGY_COUNT} strategies: ${names}`;
}

export function getCryptoStrategyListLabel(locale: 'id' | 'en'): string {
  const names = CRYPTO_STRATEGIES.map(s => s.name).join(' + ');
  return locale === 'id'
    ? `${CRYPTO_STRATEGY_COUNT} strategi: ${names}`
    : `${CRYPTO_STRATEGY_COUNT} strategies: ${names}`;
}
