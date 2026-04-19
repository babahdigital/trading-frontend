/**
 * Anti-Hallucination Validator for Pair Intelligence Briefs — Phase 2
 *
 * Layer 3: Post-validation that checks AI narrative against source data.
 * Ensures the AI didn't fabricate price levels, percentages, or data.
 * Now validates against all 6 VPS1 endpoint data sources.
 */

import type { PairDataBundle } from '@/lib/vps1/pair-data';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Extract all numbers from a text string.
 * Handles comma-separated thousands (e.g., 64,250) and decimals.
 */
function extractNumbers(text: string): number[] {
  const numbers: number[] = [];
  const regex = /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?|\d+(?:\.\d+)?)\b/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(num) && num > 0) {
      numbers.push(num);
    }
  }
  return numbers;
}

/**
 * Check if a number from the narrative exists in the source data.
 * Uses 0.1% tolerance for rounding differences.
 */
function numberExistsInSource(num: number, sourceNumbers: number[]): boolean {
  if (num < 10) return true;
  if (Number.isInteger(num) && num < 3000) return true;

  const tolerance = num * 0.001; // 0.1%
  return sourceNumbers.some((s) => Math.abs(s - num) <= tolerance);
}

/**
 * Build the set of all valid numbers from all 6 endpoint data sources.
 */
function buildSourceNumbers(data: PairDataBundle): number[] {
  const nums: number[] = [];

  // Consolidated S/R levels
  nums.push(...data.supportLevels);
  nums.push(...data.resistanceLevels);

  // SND zone boundaries
  for (const z of data.sndZones) {
    nums.push(z.high, z.low);
  }

  // Fake liquidity levels
  for (const f of data.fakeLiquidity) {
    nums.push(f.level, f.strength);
  }

  // Signal data
  for (const s of data.signals) {
    if (s.entry_price_hint) nums.push(s.entry_price_hint);
    if (s.entry_price) nums.push(s.entry_price);
    if (s.stop_loss != null) nums.push(s.stop_loss);
    if (s.take_profit != null) nums.push(s.take_profit);
    if (s.confidence) nums.push(s.confidence);
    if (s.lot) nums.push(s.lot);
  }

  // Trade ideas
  for (const t of data.tradeIdeas) {
    nums.push(t.entry, t.sl, t.tp, t.confidence);
  }

  // Meta numbers
  nums.push(data.avgConfidence);
  nums.push(data.signals.length);
  nums.push(data.signals.filter((s) => s.direction === 'BUY').length);
  nums.push(data.signals.filter((s) => s.direction === 'SELL').length);

  const push = (v: unknown) => {
    if (typeof v === 'number' && Number.isFinite(v)) nums.push(v);
  };

  // Market Snapshot — real VPS1 schema
  if (data.marketSnapshot) {
    const snap = data.marketSnapshot;
    push(snap.price?.bid); push(snap.price?.ask); push(snap.price?.mid);
    push(snap.price?.spread_points); push(snap.price?.point_size);
    push(snap.atr?.m5); push(snap.atr?.m15); push(snap.atr?.h1);
    push(snap.atr?.h4); push(snap.atr?.d1);
    if (snap.scanner) {
      push(snap.scanner.score); push(snap.scanner.volatility);
      push(snap.scanner.mtf_confluence); push(snap.scanner.higher_tf_bias);
      push(snap.scanner.smc_score); push(snap.scanner.wyckoff_score);
      push(snap.scanner.zone_score); push(snap.scanner.sr_score);
      push(snap.scanner.session_score); push(snap.scanner.spread_quality);
    }
  }

  // Technical Analysis — per-timeframe numeric fields we actually emit
  if (data.technicalAnalysis?.timeframes) {
    for (const tf of Object.values(data.technicalAnalysis.timeframes)) {
      push(tf.atr);
      push(tf.wyckoff_conf); push(tf.wyckoff_tr_high); push(tf.wyckoff_tr_low);
      push(tf.quasimodo_confidence); push(tf.quasimodo_level); push(tf.quasimodo_break_level);
      push(tf.nearest_support); push(tf.nearest_resistance);
      push(tf.nearest_demand_top); push(tf.nearest_demand_bottom); push(tf.nearest_demand_strength);
      push(tf.nearest_supply_top); push(tf.nearest_supply_bottom); push(tf.nearest_supply_strength);
      push(tf.swing_high_1); push(tf.swing_high_2);
      push(tf.swing_low_1); push(tf.swing_low_2);
      push(tf.bullish_target); push(tf.bearish_target);
      push(tf.nearest_fvg_bull_top); push(tf.nearest_fvg_bull_bottom);
      push(tf.nearest_fvg_bear_top); push(tf.nearest_fvg_bear_bottom);
    }
  }

  // Technical Extras — Fibonacci retracements + extensions
  if (data.technicalExtras?.fibonacci) {
    for (const fib of Object.values(data.technicalExtras.fibonacci)) {
      push(fib.swing_low); push(fib.swing_high);
      for (const r of fib.retracements ?? []) { push(r.price); push(r.ratio); }
      for (const r of fib.extensions ?? []) { push(r.price); push(r.ratio); }
    }
  }

  return nums;
}

/**
 * Check that direction words in narrative align with fundamental bias.
 */
function checkDirectionAlignment(narrative: string, bias: string): string[] {
  const errors: string[] = [];
  const lower = narrative.toLowerCase();

  const bullishWords = ['bullish', 'naik', 'kenaikan', 'menguat', 'penguatan'];
  const bearishWords = ['bearish', 'turun', 'penurunan', 'melemah', 'pelemahan'];

  const hasBullish = bullishWords.some((w) => lower.includes(w));
  const hasBearish = bearishWords.some((w) => lower.includes(w));

  if (bias === 'BULLISH' && hasBearish && !hasBullish) {
    errors.push(`Narrative uses bearish language but bias is BULLISH`);
  }
  if (bias === 'BEARISH' && hasBullish && !hasBearish) {
    errors.push(`Narrative uses bullish language but bias is BEARISH`);
  }

  return errors;
}

/**
 * Check that no other pair names appear in the narrative.
 */
function checkPairMention(narrative: string, targetPair: string): string[] {
  const errors: string[] = [];
  const commonPairs = [
    'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD', 'USDCHF', 'NZDUSD',
    'BTCUSD', 'ETHUSD', 'XAUUSD', 'GBPJPY', 'EURJPY', 'EURGBP',
  ];

  const upper = narrative.toUpperCase();
  for (const pair of commonPairs) {
    if (pair !== targetPair && upper.includes(pair)) {
      errors.push(`Narrative mentions unrelated pair: ${pair}`);
    }
  }
  return errors;
}

/**
 * Check that trade scenarios in narrative are consistent with trade ideas data.
 */
function checkTradeScenarios(narrative: string, data: PairDataBundle): string[] {
  const errors: string[] = [];
  const lower = narrative.toLowerCase();

  if (data.tradeIdeas.length > 0) {
    const allBuy = data.tradeIdeas.every((t) => t.direction === 'BUY');
    const allSell = data.tradeIdeas.every((t) => t.direction === 'SELL');

    if (allBuy && lower.includes('sell') && !lower.includes('buy')) {
      errors.push('Narrative recommends SELL but all trade ideas are BUY');
    }
    if (allSell && lower.includes('buy') && !lower.includes('sell')) {
      errors.push('Narrative recommends BUY but all trade ideas are SELL');
    }
  }

  return errors;
}

/**
 * Validate AI-generated narrative against source data.
 * Returns validation result with error details.
 */
export function validateBriefNarrative(
  narrative: string,
  data: PairDataBundle,
): ValidationResult {
  const errors: string[] = [];

  // 1. Check price levels — every significant number must exist in source
  const narrativeNumbers = extractNumbers(narrative);
  const sourceNumbers = buildSourceNumbers(data);

  const fabricatedNumbers = narrativeNumbers.filter(
    (n) => !numberExistsInSource(n, sourceNumbers)
  );

  if (fabricatedNumbers.length > 0) {
    errors.push(
      `Potentially fabricated numbers: ${fabricatedNumbers.slice(0, 5).map(String).join(', ')}${fabricatedNumbers.length > 5 ? ` (+${fabricatedNumbers.length - 5} more)` : ''}`
    );
  }

  // 2. Check direction alignment
  errors.push(...checkDirectionAlignment(narrative, data.fundamentalBias));

  // 3. Check no other pairs mentioned
  errors.push(...checkPairMention(narrative, data.pair));

  // 4. Check trade scenario consistency
  errors.push(...checkTradeScenarios(narrative, data));

  return {
    valid: errors.length === 0,
    errors,
  };
}
