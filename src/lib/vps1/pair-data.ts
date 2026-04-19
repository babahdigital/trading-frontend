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

/**
 * Safely unwrap VPS1 responses that may be wrapped in an object.
 * VPS1 endpoints return wrapped responses:
 *   signals/latest → {"signals": [...]}
 *   research/top-signals → {"period_hours": 24, "signals": [...]}
 *   research/latest → {"analyses": [...]}
 * But client types expect flat arrays — handle both shapes.
 */
function unwrapArray<T>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

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
 * Get entry price from signal, preferring entry_price_hint (VPS1 actual field name).
 */
function getEntryPrice(s: Vps1Signal): number | undefined {
  return s.entry_price_hint ?? s.entry_price;
}

/**
 * Extract S/R levels from signal indicator_snapshots.
 * VPS1 signals may include support/resistance in their indicator_snapshot field.
 */
function extractLevels(signals: Vps1Signal[]): { support: number[]; resistance: number[] } {
  const support = new Set<number>();
  const resistance = new Set<number>();

  for (const s of signals) {
    // Check both indicator_snapshot and indicator_snapshot_summary
    const snap = s.indicator_snapshot || s.indicator_snapshot_summary;

    if (snap) {
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
    }

    // Extract from entry_price_hint, stop_loss, take_profit
    const entry = getEntryPrice(s);
    if (s.direction === 'BUY') {
      if (s.stop_loss != null) support.add(s.stop_loss);
      if (s.take_profit != null) resistance.add(s.take_profit);
      if (entry) support.add(entry); // entry near support for BUY
    } else {
      if (s.stop_loss != null) resistance.add(s.stop_loss);
      if (s.take_profit != null) support.add(s.take_profit);
      if (entry) resistance.add(entry); // entry near resistance for SELL
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
  const seen = new Set<string>();

  for (const s of signals) {
    // From detailed indicator_snapshot
    const snap = s.indicator_snapshot;
    if (snap && Array.isArray(snap.patterns)) {
      for (const p of snap.patterns) {
        if (p && typeof p.name === 'string') {
          const key = `${p.name}-${p.tf}`;
          if (!seen.has(key)) {
            seen.add(key);
            patterns.push({
              name: p.name,
              tf: p.tf || 'H4',
              description: p.description || p.name,
            });
          }
        }
      }
    }

    // From summary — extract pattern info from entry_type + snapshot_summary
    const summary = s.indicator_snapshot_summary;
    if (summary) {
      // Detect Wyckoff events from summary
      if (summary.h1_event && summary.h1_event !== 'none') {
        const key = `wyckoff-${summary.h1_event}-H1`;
        if (!seen.has(key)) {
          seen.add(key);
          patterns.push({
            name: `Wyckoff ${String(summary.h1_event)}`,
            tf: 'H1',
            description: `H1 Wyckoff ${String(summary.h1_event)} event detected`,
          });
        }
      }
      // Detect QM from M5
      if (summary.m5_qm && summary.m5_qm !== 'none') {
        const key = `qm-${summary.m5_qm}-M5`;
        if (!seen.has(key)) {
          seen.add(key);
          patterns.push({
            name: `QM ${String(summary.m5_qm)}`,
            tf: 'M5',
            description: `M5 Quasimodo ${String(summary.m5_qm)} pattern`,
          });
        }
      }
    }

    // From entry_type (e.g., "wyckoff_combo", "qm_ao_combo")
    if (s.entry_type) {
      const key = `entry-${s.entry_type}`;
      if (!seen.has(key)) {
        seen.add(key);
        const name = s.entry_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        patterns.push({
          name,
          tf: 'Multi',
          description: s.reasoning?.slice(0, 100) || name,
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
    .filter((s) => (s.confidence ?? 0) >= 0.75 && getEntryPrice(s) && s.stop_loss != null && s.take_profit != null)
    .slice(0, 3) // max 3 ideas per brief
    .map((s) => ({
      direction: s.direction,
      entry: getEntryPrice(s)!,
      sl: s.stop_loss!,
      tp: s.take_profit!,
      rationale: s.reasoning || `${s.direction} signal at ${getEntryPrice(s)} with confidence ${s.confidence}`,
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
    // NOTE: VPS1 signals/latest pair filter is broken — fetch all and filter client-side
    // NOTE: VPS1 wraps arrays in objects — unwrap safely
    const [signalsRaw, topSignalsRaw, researchRaw] = await Promise.allSettled([
      getLatestSignals({ limit: 50 }),
      getTopSignals(24, 30),
      getLatestResearch(30),
    ]);

    const signalsList = signalsRaw.status === 'fulfilled'
      ? unwrapArray<Vps1Signal>(signalsRaw.value, ['signals'])
      : [];
    const topList = topSignalsRaw.status === 'fulfilled'
      ? unwrapArray<Vps1Signal>(topSignalsRaw.value, ['signals'])
      : [];
    const researchList = researchRaw.status === 'fulfilled'
      ? unwrapArray<Vps1ResearchItem>(researchRaw.value, ['analyses', 'items', 'research'])
      : [];

    const pairSignals = [
      ...signalsList.filter((s) => s.pair === pair),
      ...topList.filter((s) => s.pair === pair),
    ];

    // Deduplicate signals by id
    const seenIds = new Set<number>();
    const uniqueSignals = pairSignals.filter((s) => {
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      return true;
    }) as Vps1Signal[];

    const researchItems = researchList.filter((r) => r.pair === pair);

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
