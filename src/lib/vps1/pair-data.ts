/**
 * VPS1 Pair Data Aggregator
 *
 * Fetches data from multiple existing VPS1 endpoints for a single pair
 * and structures it into a PairDataBundle for brief generation.
 * Returns null if VPS1 is unreachable — caller must handle gracefully.
 */

import {
  getLatestSignals,
  getTopSignals,
  getLatestResearch,
  Vps1Signal,
  Vps1ResearchItem,
  Vps1Error,
} from './client';
import { createLogger } from '@/lib/logger';

const log = createLogger('pair-data');

export interface SndZone {
  type: 'DEMAND' | 'SUPPLY';
  high: number;
  low: number;
  tf: string;
}

export interface KeyPattern {
  name: string;
  tf: string;
  description: string;
}

export interface FakeLiquiditySignal {
  level: number;
  type: 'ABOVE_RESISTANCE' | 'BELOW_SUPPORT';
  strength: number;
}

export interface TradeIdeaRaw {
  direction: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  rationale: string;
  confidence: number;
}

export interface PairDataBundle {
  pair: string;
  fetchedAt: string;
  signals: Vps1Signal[];
  researchItems: Vps1ResearchItem[];
  supportLevels: number[];
  resistanceLevels: number[];
  sndZones: SndZone[];
  keyPatterns: KeyPattern[];
  fakeLiquidity: FakeLiquiditySignal[];
  fundamentalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  avgConfidence: number;
  tradeIdeas: TradeIdeaRaw[];
}

/**
 * Extract S/R levels from signal indicator_snapshots.
 * VPS1 signals may include support/resistance in their indicator_snapshot field.
 */
function extractLevels(signals: Vps1Signal[]): { support: number[]; resistance: number[] } {
  const support = new Set<number>();
  const resistance = new Set<number>();

  for (const s of signals) {
    const snap = s.indicator_snapshot;
    if (!snap) continue;

    // VPS1 may store levels as arrays in indicator_snapshot
    if (Array.isArray(snap.support_levels)) {
      for (const lvl of snap.support_levels) {
        if (typeof lvl === 'number') support.add(lvl);
      }
    }
    if (Array.isArray(snap.resistance_levels)) {
      for (const lvl of snap.resistance_levels) {
        if (typeof lvl === 'number') resistance.add(lvl);
      }
    }

    // Also extract from stop_loss (approximate support) and take_profit (approximate resistance)
    if (s.direction === 'BUY') {
      if (s.stop_loss != null) support.add(s.stop_loss);
      if (s.take_profit != null) resistance.add(s.take_profit);
    } else {
      if (s.stop_loss != null) resistance.add(s.stop_loss);
      if (s.take_profit != null) support.add(s.take_profit);
    }
  }

  return {
    support: [...support].sort((a, b) => b - a),
    resistance: [...resistance].sort((a, b) => a - b),
  };
}

/**
 * Extract SND zones from indicator snapshots.
 */
function extractSndZones(signals: Vps1Signal[]): SndZone[] {
  const zones: SndZone[] = [];
  for (const s of signals) {
    const snap = s.indicator_snapshot;
    if (!snap || !Array.isArray(snap.snd_zones)) continue;
    for (const z of snap.snd_zones) {
      if (z && typeof z.high === 'number' && typeof z.low === 'number') {
        zones.push({
          type: z.type === 'SUPPLY' ? 'SUPPLY' : 'DEMAND',
          high: z.high,
          low: z.low,
          tf: z.tf || 'H4',
        });
      }
    }
  }
  return zones;
}

/**
 * Extract key patterns (QM, Wyckoff, etc.) from indicator snapshots.
 */
function extractPatterns(signals: Vps1Signal[]): KeyPattern[] {
  const patterns: KeyPattern[] = [];
  for (const s of signals) {
    const snap = s.indicator_snapshot;
    if (!snap || !Array.isArray(snap.patterns)) continue;
    for (const p of snap.patterns) {
      if (p && typeof p.name === 'string') {
        patterns.push({
          name: p.name,
          tf: p.tf || 'H4',
          description: p.description || p.name,
        });
      }
    }
  }
  return patterns;
}

/**
 * Extract fake liquidity signals from indicator snapshots.
 */
function extractFakeLiquidity(signals: Vps1Signal[]): FakeLiquiditySignal[] {
  const fakes: FakeLiquiditySignal[] = [];
  for (const s of signals) {
    const snap = s.indicator_snapshot;
    if (!snap || !Array.isArray(snap.fake_liquidity)) continue;
    for (const f of snap.fake_liquidity) {
      if (f && typeof f.level === 'number') {
        fakes.push({
          level: f.level,
          type: f.type === 'ABOVE_RESISTANCE' ? 'ABOVE_RESISTANCE' : 'BELOW_SUPPORT',
          strength: typeof f.strength === 'number' ? f.strength : 0.5,
        });
      }
    }
  }
  return fakes;
}

/**
 * Determine fundamental bias from signal consensus.
 */
function determineBias(signals: Vps1Signal[]): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  let buyWeight = 0;
  let sellWeight = 0;
  for (const s of signals) {
    const conf = s.confidence ?? 0.5;
    if (s.direction === 'BUY') buyWeight += conf;
    else sellWeight += conf;
  }
  if (buyWeight === 0 && sellWeight === 0) return 'NEUTRAL';
  const ratio = buyWeight / (buyWeight + sellWeight);
  if (ratio > 0.6) return 'BULLISH';
  if (ratio < 0.4) return 'BEARISH';
  return 'NEUTRAL';
}

/**
 * Build trade ideas from high-confidence signals.
 */
function buildTradeIdeas(signals: Vps1Signal[]): TradeIdeaRaw[] {
  return signals
    .filter((s) => (s.confidence ?? 0) >= 0.75 && s.entry_price && s.stop_loss != null && s.take_profit != null)
    .slice(0, 3) // max 3 ideas per brief
    .map((s) => ({
      direction: s.direction,
      entry: s.entry_price!,
      sl: s.stop_loss!,
      tp: s.take_profit!,
      rationale: s.reasoning || `${s.direction} signal at ${s.entry_price} with confidence ${s.confidence}`,
      confidence: s.confidence ?? 0.75,
    }));
}

/**
 * Fetch and aggregate all available data for a pair from VPS1.
 * Returns null if VPS1 is unreachable.
 */
export async function fetchPairData(pair: string): Promise<PairDataBundle | null> {
  try {
    // Fetch from multiple endpoints in parallel
    const [signals, topSignals, research] = await Promise.allSettled([
      getLatestSignals({ pair, limit: 30 }),
      getTopSignals(24, 20),
      getLatestResearch(30),
    ]);

    const pairSignals = [
      ...(signals.status === 'fulfilled' ? signals.value : []),
      ...(topSignals.status === 'fulfilled'
        ? topSignals.value.filter((r) => r.pair === pair)
        : []),
    ];

    // Deduplicate signals by id
    const seenIds = new Set<number>();
    const uniqueSignals = pairSignals.filter((s) => {
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      return true;
    }) as Vps1Signal[];

    const researchItems = research.status === 'fulfilled'
      ? research.value.filter((r) => r.pair === pair)
      : [];

    // If we got zero data from all endpoints, treat as VPS1 unavailable
    if (uniqueSignals.length === 0 && researchItems.length === 0) {
      log.warn(`No data from VPS1 for ${pair} — all endpoints returned empty`);
      return null;
    }

    const { support, resistance } = extractLevels(uniqueSignals);
    const avgConf = uniqueSignals.length > 0
      ? uniqueSignals.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / uniqueSignals.length
      : 0;

    return {
      pair,
      fetchedAt: new Date().toISOString(),
      signals: uniqueSignals,
      researchItems,
      supportLevels: support,
      resistanceLevels: resistance,
      sndZones: extractSndZones(uniqueSignals),
      keyPatterns: extractPatterns(uniqueSignals),
      fakeLiquidity: extractFakeLiquidity(uniqueSignals),
      fundamentalBias: determineBias(uniqueSignals),
      avgConfidence: Math.round(avgConf * 100) / 100,
      tradeIdeas: buildTradeIdeas(uniqueSignals),
    };
  } catch (err) {
    if (err instanceof Vps1Error) {
      log.warn(`VPS1 unreachable for ${pair}: ${err.status} ${err.message}`);
    } else {
      log.error('Pair data fetch error:', err instanceof Error ? err.message : 'unknown');
    }
    return null;
  }
}
