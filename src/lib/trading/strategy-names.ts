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
  qm_perfect_full_m30: 'SMC · QM Full (M30)',
  qm_perfect_full_m5: 'SMC · QM Full (M5)',
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
  // Quad Confluence (backend: quad_confluence — AMD/FVG multi-factor)
  quad_confluence: 'Quad Confluence',
  amd_fvg: 'AMD + FVG',
  amd_fvg_adx: 'AMD + FVG + ADX',
  amd_fvg_full: 'AMD + FVG Full',
  amd_fvg_pure: 'AMD + FVG Pure',
  // Crypto strategies (backend trading-crypto, USDT-M Futures only)
  scalping_momentum: 'Scalping Momentum',
  swing_smc: 'Swing SMC',
  wyckoff_breakout: 'Wyckoff Breakout',
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
