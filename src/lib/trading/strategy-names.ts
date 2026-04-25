/**
 * Strategy display names — institutional-grade real names with optional
 * obfuscation toggle for paranoia mode.
 *
 * Set `STRATEGY_OBFUSCATION_ENABLED=1` env var (or SiteSetting key
 * `strategy_obfuscation_enabled=true`) to fall back to opaque "Strategi A/B/…"
 * labels. Default OFF — institutional clients want real names.
 */

const REAL_NAMES: Record<string, string> = {
  smc: 'Smart Money Concepts',
  wyckoff: 'Wyckoff Method',
  momentum: 'Momentum Continuation',
  oil_gas: 'Energy Commodity',
  astronacci: 'Astro-Fibonacci',
  swing: 'Swing Confluence',
  scalping_momentum: 'Scalping Momentum',
  swing_smc: 'Swing SMC',
  wyckoff_breakout: 'Wyckoff Breakout',
  spot_dca_trend: 'Spot DCA Trend',
  spot_swing_trend: 'Spot Swing Trend',
  mean_reversion: 'Mean Reversion',
};

const OBFUSCATED_NAMES: Record<string, string> = {
  smc: 'Strategi A',
  wyckoff: 'Strategi B',
  momentum: 'Strategi C',
  oil_gas: 'Strategi D',
  astronacci: 'Strategi E',
  swing: 'Strategi F',
};

export function strategyDisplayName(setup: string | undefined | null, obfuscate = false): string {
  if (!setup) return '—';
  const key = setup.toLowerCase();
  if (obfuscate) return OBFUSCATED_NAMES[key] ?? REAL_NAMES[key] ?? setup;
  return REAL_NAMES[key] ?? setup;
}

export function isStrategyObfuscationEnabled(): boolean {
  return process.env.NEXT_PUBLIC_STRATEGY_OBFUSCATION === '1';
}
