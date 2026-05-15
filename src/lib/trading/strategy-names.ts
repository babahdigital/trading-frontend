/**
 * Strategy display names — institutional-grade real names with optional
 * obfuscation toggle for paranoia mode.
 *
 * Set `STRATEGY_OBFUSCATION_ENABLED=1` env var (or SiteSetting key
 * `strategy_obfuscation_enabled=true`) to fall back to opaque "Strategi A/B/…"
 * labels. Default OFF — institutional clients want real names.
 */

const REAL_NAMES: Record<string, string> = {
  // SMC scalper family (backend: scalper.qm_perfect_*)
  smc: 'Smart Money Concepts',
  qm_perfect_pure: 'SMC · QM Pure',
  qm_perfect_ao: 'SMC · QM + Awesome Oscillator',
  qm_perfect_adx: 'SMC · QM + ADX',
  qm_perfect_full: 'SMC · QM Full Confluence',
  qm_perfect_adx_h4: 'SMC · QM ADX (H4 tuned)',
  // SMC swing family (backend: swing.qm_perfect_*)
  swing_qm_perfect_pure: 'SMC Swing · Pure',
  swing_qm_perfect_ao: 'SMC Swing + AO',
  swing_qm_perfect_adx: 'SMC Swing + ADX',
  swing_qm_perfect_full: 'SMC Swing · Full',
  swing: 'SMC Swing',
  smc_swing: 'SMC Swing',
  // Pivot mean reversion (backend: scalper.pivot_mean_reversion)
  pivot_mean_reversion: 'Pivot Mean Reversion',
  // Crypto strategies (backend trading-crypto)
  scalping_momentum: 'Scalping Momentum',
  swing_smc: 'Swing SMC',
  wyckoff_breakout: 'Wyckoff Breakout',
  spot_dca_trend: 'Spot DCA Trend',
  spot_swing_trend: 'Spot Swing Trend',
  mean_reversion: 'Mean Reversion',
};

const OBFUSCATED_NAMES: Record<string, string> = {
  smc: 'Strategi A',
  smc_swing: 'Strategi B',
  pivot_mean_reversion: 'Strategi C',
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
