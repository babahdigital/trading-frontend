/**
 * Anti-Hallucination Validator for Pair Intelligence Briefs
 *
 * Layer 3: Post-validation that checks AI narrative against source data.
 * Ensures the AI didn't fabricate price levels, percentages, or data.
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
  // Match numbers with optional comma thousands and decimal point
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
  // Skip small numbers that are likely generic (confidence %, counts, etc.)
  if (num < 10) return true;
  // Skip round numbers that are likely just dates, counts, word counts, or years
  if (Number.isInteger(num) && num < 3000) return true;

  const tolerance = num * 0.001; // 0.1%
  return sourceNumbers.some((s) => Math.abs(s - num) <= tolerance);
}

/**
 * Build the set of all valid numbers from source data.
 */
function buildSourceNumbers(data: PairDataBundle): number[] {
  const nums: number[] = [];

  // S/R levels
  nums.push(...data.supportLevels);
  nums.push(...data.resistanceLevels);

  // SND zone boundaries
  for (const z of data.sndZones) {
    nums.push(z.high, z.low);
  }

  // Fake liquidity levels
  for (const f of data.fakeLiquidity) {
    nums.push(f.level);
    nums.push(f.strength);
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

  // Average confidence
  nums.push(data.avgConfidence);

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

  // Only flag if the dominant direction contradicts the bias
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

  return {
    valid: errors.length === 0,
    errors,
  };
}
