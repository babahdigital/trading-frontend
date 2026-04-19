/**
 * VPS1 Pair Data Aggregator — Phase 2
 *
 * Fetches data from 6 VPS1 endpoints in parallel for a single pair:
 *   1. signals/latest       — recent trading signals
 *   2. research/top-signals — top-ranked signals
 *   3. research/market-snapshot/{pair} — live price, session info, ATR
 *   4. research/calendar/{pair}        — economic calendar events
 *   5. research/technical-analysis/{pair} — multi-TF indicators, S/R, SND, patterns
 *   6. research/technical-extras/{pair}   — liquidity pools, session levels, order flow
 *
 * Returns null if VPS1 is unreachable — caller must handle gracefully.
 */

import {
  getLatestSignals,
  getTopSignals,
  getMarketSnapshot,
  getCalendar,
  getTechnicalAnalysis,
  getTechnicalExtras,
  Vps1Signal,
  Vps1MarketSnapshot,
  Vps1Calendar,
  Vps1TechnicalAnalysis,
  Vps1TechnicalExtras,
  Vps1Error,
} from './client';
import { createLogger } from '@/lib/logger';

const log = createLogger('pair-data');

/**
 * Safely unwrap VPS1 responses that may be wrapped in an object.
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
  supportLevels: number[];
  resistanceLevels: number[];
  sndZones: SndZone[];
  keyPatterns: KeyPattern[];
  fakeLiquidity: FakeLiquiditySignal[];
  fundamentalBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  avgConfidence: number;
  tradeIdeas: TradeIdeaRaw[];
  // Phase 2: dedicated endpoint data
  marketSnapshot: Vps1MarketSnapshot | null;
  calendar: Vps1Calendar | null;
  technicalAnalysis: Vps1TechnicalAnalysis | null;
  technicalExtras: Vps1TechnicalExtras | null;
}

/**
 * Get entry price from signal, preferring entry_price_hint (VPS1 actual field name).
 */
function getEntryPrice(s: Vps1Signal): number | undefined {
  return s.entry_price_hint ?? s.entry_price;
}

const MAX_LEVELS_PER_SIDE = 8;

/**
 * Extract S/R levels from dedicated technical-analysis + signal indicator_snapshots.
 *
 * When currentPrice is known, reclassify every candidate level against it:
 * levels below current price become supports (sorted nearest-first, i.e.
 * descending), levels above become resistances (sorted nearest-first, i.e.
 * ascending). VPS1's original support/resistance labelling is historical and
 * may flip as price moves, so using current price is more accurate for a
 * brief consumed at publish-time.
 */
function extractLevels(
  signals: Vps1Signal[],
  ta: Vps1TechnicalAnalysis | null,
  currentPrice: number | null,
): { support: number[]; resistance: number[] } {
  const candidates = new Set<number>();

  // Primary: dedicated technical-analysis endpoint
  if (ta?.timeframes) {
    for (const tf of Object.values(ta.timeframes)) {
      if (tf.key_levels) {
        for (const lvl of tf.key_levels.support ?? []) {
          if (typeof lvl === 'number') candidates.add(lvl);
        }
        for (const lvl of tf.key_levels.resistance ?? []) {
          if (typeof lvl === 'number') candidates.add(lvl);
        }
      }
    }
  }

  // Supplementary: signal indicator_snapshots + entry/SL/TP
  for (const s of signals) {
    const snap = s.indicator_snapshot || s.indicator_snapshot_summary;
    if (snap) {
      if (Array.isArray(snap.support_levels)) {
        for (const lvl of snap.support_levels) {
          if (typeof lvl === 'number') candidates.add(lvl);
        }
      }
      if (Array.isArray(snap.resistance_levels)) {
        for (const lvl of snap.resistance_levels) {
          if (typeof lvl === 'number') candidates.add(lvl);
        }
      }
    }
    if (s.stop_loss != null) candidates.add(s.stop_loss);
    if (s.take_profit != null) candidates.add(s.take_profit);
    const entry = getEntryPrice(s);
    if (entry) candidates.add(entry);
  }

  const levels = [...candidates];

  // Without a reference price we fall back to the legacy labelling path so
  // existing tests and non-snapshot pairs still produce sensible arrays.
  if (currentPrice == null || !Number.isFinite(currentPrice)) {
    const support: number[] = [];
    const resistance: number[] = [];
    if (ta?.timeframes) {
      for (const tf of Object.values(ta.timeframes)) {
        for (const lvl of tf.key_levels?.support ?? []) {
          if (typeof lvl === 'number') support.push(lvl);
        }
        for (const lvl of tf.key_levels?.resistance ?? []) {
          if (typeof lvl === 'number') resistance.push(lvl);
        }
      }
    }
    return {
      support: [...new Set(support)].sort((a, b) => b - a).slice(0, MAX_LEVELS_PER_SIDE),
      resistance: [...new Set(resistance)].sort((a, b) => a - b).slice(0, MAX_LEVELS_PER_SIDE),
    };
  }

  const support = levels.filter((l) => l < currentPrice).sort((a, b) => b - a).slice(0, MAX_LEVELS_PER_SIDE);
  const resistance = levels.filter((l) => l > currentPrice).sort((a, b) => a - b).slice(0, MAX_LEVELS_PER_SIDE);
  return { support, resistance };
}

/**
 * Extract SND zones from dedicated technical-analysis + signal indicator snapshots.
 */
function extractSndZones(signals: Vps1Signal[], ta: Vps1TechnicalAnalysis | null): SndZone[] {
  const zones: SndZone[] = [];
  const seen = new Set<string>();

  // Primary: dedicated technical-analysis endpoint
  if (ta?.timeframes) {
    for (const [tfName, tf] of Object.entries(ta.timeframes)) {
      if (Array.isArray(tf.snd_zones)) {
        for (const z of tf.snd_zones) {
          if (z && typeof z.high === 'number' && typeof z.low === 'number') {
            const key = `${z.type}-${z.high}-${z.low}-${tfName}`;
            if (!seen.has(key)) {
              seen.add(key);
              zones.push({
                type: z.type === 'SUPPLY' ? 'SUPPLY' : 'DEMAND',
                high: z.high,
                low: z.low,
                tf: tfName,
              });
            }
          }
        }
      }
    }
  }

  // Supplementary: signal indicator snapshots
  for (const s of signals) {
    const snap = s.indicator_snapshot;
    if (!snap || !Array.isArray(snap.snd_zones)) continue;
    for (const z of snap.snd_zones) {
      if (z && typeof z.high === 'number' && typeof z.low === 'number') {
        const key = `${z.type}-${z.high}-${z.low}-${z.tf || 'H4'}`;
        if (!seen.has(key)) {
          seen.add(key);
          zones.push({
            type: z.type === 'SUPPLY' ? 'SUPPLY' : 'DEMAND',
            high: z.high,
            low: z.low,
            tf: z.tf || 'H4',
          });
        }
      }
    }
  }
  return zones;
}

/**
 * Extract key patterns from dedicated technical-analysis + signal indicator snapshots.
 */
function extractPatterns(signals: Vps1Signal[], ta: Vps1TechnicalAnalysis | null): KeyPattern[] {
  const patterns: KeyPattern[] = [];
  const seen = new Set<string>();

  // Primary: dedicated technical-analysis endpoint
  if (ta?.timeframes) {
    for (const [tfName, tf] of Object.entries(ta.timeframes)) {
      if (Array.isArray(tf.patterns)) {
        for (const p of tf.patterns) {
          if (p && typeof p.name === 'string') {
            const key = `${p.name}-${tfName}`;
            if (!seen.has(key)) {
              seen.add(key);
              patterns.push({
                name: p.name,
                tf: tfName,
                description: p.description || p.name,
              });
            }
          }
        }
      }
    }
  }

  // Supplementary: signal indicator_snapshot
  for (const s of signals) {
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

    const summary = s.indicator_snapshot_summary;
    if (summary) {
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
 * Extract liquidity signals from dedicated technical-extras + signal indicator snapshots.
 */
function extractFakeLiquidity(
  signals: Vps1Signal[],
  extras: Vps1TechnicalExtras | null,
): FakeLiquiditySignal[] {
  const fakes: FakeLiquiditySignal[] = [];
  const seen = new Set<string>();

  // Primary: dedicated technical-extras endpoint
  if (extras?.liquidity_pools) {
    for (const pool of extras.liquidity_pools) {
      if (typeof pool.level === 'number') {
        const key = `${pool.level}-${pool.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          fakes.push({
            level: pool.level,
            type: pool.type === 'ABOVE_RESISTANCE' ? 'ABOVE_RESISTANCE' : 'BELOW_SUPPORT',
            strength: typeof pool.strength === 'number' ? pool.strength : 0.5,
          });
        }
      }
    }
  }

  // Supplementary: signal indicator snapshots
  for (const s of signals) {
    const snap = s.indicator_snapshot;
    if (!snap || !Array.isArray(snap.fake_liquidity)) continue;
    for (const f of snap.fake_liquidity) {
      if (f && typeof f.level === 'number') {
        const key = `${f.level}-${f.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          fakes.push({
            level: f.level,
            type: f.type === 'ABOVE_RESISTANCE' ? 'ABOVE_RESISTANCE' : 'BELOW_SUPPORT',
            strength: typeof f.strength === 'number' ? f.strength : 0.5,
          });
        }
      }
    }
  }
  return fakes;
}

/**
 * Determine fundamental bias from multi-TF confluence + signal consensus.
 */
function determineBias(
  signals: Vps1Signal[],
  ta: Vps1TechnicalAnalysis | null,
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  // Prefer multi-TF confluence from dedicated endpoint
  if (ta?.multi_tf_confluence?.dominant_bias) {
    const bias = ta.multi_tf_confluence.dominant_bias.toUpperCase();
    if (bias === 'BULLISH' || bias === 'BEARISH') return bias;
  }

  // Fallback to signal consensus
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
    .slice(0, 3)
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
 * Phase 2: Uses 6 parallel endpoint calls for maximum data richness.
 * Returns null if VPS1 is completely unreachable.
 */
export async function fetchPairData(pair: string): Promise<PairDataBundle | null> {
  try {
    // Fetch from 6 endpoints in parallel
    const [signalsRaw, topSignalsRaw, snapshotRaw, calendarRaw, taRaw, extrasRaw] = await Promise.allSettled([
      getLatestSignals({ limit: 50 }),
      getTopSignals(24, 30),
      getMarketSnapshot(pair),
      getCalendar(pair),
      getTechnicalAnalysis(pair),
      getTechnicalExtras(pair),
    ]);

    // Unwrap signal arrays (VPS1 wraps in objects)
    const signalsList = signalsRaw.status === 'fulfilled'
      ? unwrapArray<Vps1Signal>(signalsRaw.value, ['signals'])
      : [];
    const topList = topSignalsRaw.status === 'fulfilled'
      ? unwrapArray<Vps1Signal>(topSignalsRaw.value, ['signals'])
      : [];

    // Dedicated endpoints return objects directly
    const snapshot = snapshotRaw.status === 'fulfilled' ? snapshotRaw.value : null;
    const calendar = calendarRaw.status === 'fulfilled' ? calendarRaw.value : null;
    const ta = taRaw.status === 'fulfilled' ? taRaw.value : null;
    const extras = extrasRaw.status === 'fulfilled' ? extrasRaw.value : null;

    // Log which endpoints succeeded/failed
    const endpointStatus = {
      signals: signalsRaw.status,
      topSignals: topSignalsRaw.status,
      snapshot: snapshotRaw.status,
      calendar: calendarRaw.status,
      technicalAnalysis: taRaw.status,
      technicalExtras: extrasRaw.status,
    };
    log.info(`VPS1 endpoint status for ${pair}: ${JSON.stringify(endpointStatus)}`);

    // Filter signals for this pair (VPS1 pair filter is broken)
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

    // If ALL 6 endpoints failed, treat as VPS1 unavailable
    const anySuccess = uniqueSignals.length > 0 || snapshot || ta || extras;
    if (!anySuccess) {
      log.warn(`No data from VPS1 for ${pair} — all endpoints returned empty/failed`);
      return null;
    }

    const currentPrice = typeof snapshot?.current_price === 'number' ? snapshot.current_price : null;
    const { support, resistance } = extractLevels(uniqueSignals, ta, currentPrice);
    const avgConf = uniqueSignals.length > 0
      ? uniqueSignals.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / uniqueSignals.length
      : (ta?.multi_tf_confluence?.score ?? 0);

    return {
      pair,
      fetchedAt: new Date().toISOString(),
      signals: uniqueSignals,
      supportLevels: support,
      resistanceLevels: resistance,
      sndZones: extractSndZones(uniqueSignals, ta),
      keyPatterns: extractPatterns(uniqueSignals, ta),
      fakeLiquidity: extractFakeLiquidity(uniqueSignals, extras),
      fundamentalBias: determineBias(uniqueSignals, ta),
      avgConfidence: Math.round(avgConf * 100) / 100,
      tradeIdeas: buildTradeIdeas(uniqueSignals),
      marketSnapshot: snapshot,
      calendar,
      technicalAnalysis: ta,
      technicalExtras: extras,
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
