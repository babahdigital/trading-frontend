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

function isFiniteNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Collect every price-level scalar VPS1 exposes for a pair, then split by
 * current price into supports (nearest-first descending) and resistances
 * (nearest-first ascending). VPS1 publishes dozens of per-timeframe level
 * fields (nearest_support, nearest_supply_top/bottom, swing_high_1/2, FVG
 * bounds, Wyckoff TR high/low, Fib retracement prices, etc.) — we gather
 * all numeric ones, dedupe, and reclassify against current_price so the
 * brief reflects where price actually is at publish-time rather than the
 * historical label attached by the source.
 */
function extractLevels(
  signals: Vps1Signal[],
  ta: Vps1TechnicalAnalysis | null,
  extras: Vps1TechnicalExtras | null,
  currentPrice: number | null,
): { support: number[]; resistance: number[] } {
  const candidates = new Set<number>();
  const push = (v: unknown) => { if (isFiniteNum(v)) candidates.add(v); };

  // Technical-analysis: per-timeframe price-level fields
  if (ta?.timeframes) {
    for (const tf of Object.values(ta.timeframes)) {
      push(tf.nearest_support);
      push(tf.nearest_resistance);
      push(tf.nearest_demand_top); push(tf.nearest_demand_bottom);
      push(tf.nearest_supply_top); push(tf.nearest_supply_bottom);
      push(tf.swing_high_1); push(tf.swing_high_2);
      push(tf.swing_low_1); push(tf.swing_low_2);
      push(tf.wyckoff_tr_high); push(tf.wyckoff_tr_low);
      push(tf.bullish_target); push(tf.bearish_target);
      push(tf.nearest_fvg_bull_top); push(tf.nearest_fvg_bull_bottom);
      push(tf.nearest_fvg_bear_top); push(tf.nearest_fvg_bear_bottom);
      push(tf.quasimodo_level); push(tf.quasimodo_break_level);
    }
  }

  // Technical-extras: Fibonacci retracements per timeframe
  if (extras?.fibonacci) {
    for (const fib of Object.values(extras.fibonacci)) {
      push(fib.swing_low); push(fib.swing_high);
      for (const r of fib.retracements ?? []) push(r.price);
    }
  }

  // Signals: entry / SL / TP
  for (const s of signals) {
    push(s.stop_loss);
    push(s.take_profit);
    push(getEntryPrice(s));
  }

  const levels = [...candidates];

  if (currentPrice == null || !Number.isFinite(currentPrice)) {
    // Without a reference price, best we can do is split around the median.
    levels.sort((a, b) => a - b);
    const mid = Math.floor(levels.length / 2);
    const below = levels.slice(0, mid).reverse();
    const above = levels.slice(mid);
    return {
      support: below.slice(0, MAX_LEVELS_PER_SIDE),
      resistance: above.slice(0, MAX_LEVELS_PER_SIDE),
    };
  }

  const support = levels.filter((l) => l < currentPrice).sort((a, b) => b - a).slice(0, MAX_LEVELS_PER_SIDE);
  const resistance = levels.filter((l) => l > currentPrice).sort((a, b) => a - b).slice(0, MAX_LEVELS_PER_SIDE);
  return { support, resistance };
}

/**
 * VPS1 emits exactly one nearest demand zone and one nearest supply zone per
 * timeframe via `nearest_demand_{top,bottom}` / `nearest_supply_{top,bottom}`.
 * We materialize those into SndZone records and dedupe across timeframes.
 */
function extractSndZones(signals: Vps1Signal[], ta: Vps1TechnicalAnalysis | null): SndZone[] {
  const zones: SndZone[] = [];
  const seen = new Set<string>();
  const add = (type: 'SUPPLY' | 'DEMAND', top: unknown, bottom: unknown, tf: string) => {
    if (!isFiniteNum(top) || !isFiniteNum(bottom)) return;
    const low = Math.min(top, bottom);
    const high = Math.max(top, bottom);
    const key = `${type}-${low}-${high}-${tf}`;
    if (seen.has(key)) return;
    seen.add(key);
    zones.push({ type, low, high, tf });
  };

  if (ta?.timeframes) {
    for (const [tfName, tf] of Object.entries(ta.timeframes)) {
      const TF = tfName.toUpperCase();
      add('DEMAND', tf.nearest_demand_top, tf.nearest_demand_bottom, TF);
      add('SUPPLY', tf.nearest_supply_top, tf.nearest_supply_bottom, TF);
    }
  }

  // Legacy path: signals may ship an indicator_snapshot with snd_zones array
  for (const s of signals) {
    const snap = s.indicator_snapshot as Record<string, unknown> | undefined;
    const arr = snap && Array.isArray(snap.snd_zones) ? (snap.snd_zones as Array<Record<string, unknown>>) : [];
    for (const z of arr) {
      if (isFiniteNum(z.high) && isFiniteNum(z.low)) {
        const type = z.type === 'SUPPLY' ? 'SUPPLY' : 'DEMAND';
        const tf = typeof z.tf === 'string' ? z.tf : 'H4';
        const key = `${type}-${z.low}-${z.high}-${tf}`;
        if (!seen.has(key)) {
          seen.add(key);
          zones.push({ type, high: z.high, low: z.low, tf });
        }
      }
    }
  }
  return zones;
}

/**
 * Pull named patterns (Wyckoff events, Quasimodo, BOS, CHoCH) from the
 * per-timeframe TA payload and from signal summary fields.
 */
function extractPatterns(signals: Vps1Signal[], ta: Vps1TechnicalAnalysis | null): KeyPattern[] {
  const patterns: KeyPattern[] = [];
  const seen = new Set<string>();
  const push = (name: string, tf: string, description: string) => {
    const key = `${name}-${tf}`;
    if (seen.has(key)) return;
    seen.add(key);
    patterns.push({ name, tf, description });
  };
  const live = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v !== 'none';

  if (ta?.timeframes) {
    for (const [tfName, tf] of Object.entries(ta.timeframes)) {
      const TF = tfName.toUpperCase();
      if (live(tf.wyckoff_event)) {
        const conf = isFiniteNum(tf.wyckoff_conf) ? ` (conf ${tf.wyckoff_conf})` : '';
        const phase = live(tf.wyckoff_phase) ? tf.wyckoff_phase : 'unknown';
        push(`Wyckoff ${tf.wyckoff_event}`, TF, `Wyckoff ${tf.wyckoff_event} in ${phase} phase${conf}`);
      }
      if (live(tf.quasimodo_pattern)) {
        const conf = isFiniteNum(tf.quasimodo_confidence) ? ` (conf ${tf.quasimodo_confidence})` : '';
        push(`Quasimodo ${tf.quasimodo_pattern}`, TF, `Quasimodo ${tf.quasimodo_pattern} pattern${conf}`);
      }
      if (live(tf.last_bos)) push(`BOS ${tf.last_bos}`, TF, `Last break-of-structure: ${tf.last_bos}`);
      if (live(tf.last_choch)) push(`CHoCH ${tf.last_choch}`, TF, `Last change-of-character: ${tf.last_choch}`);
    }
  }

  for (const s of signals) {
    const summary = s.indicator_snapshot_summary as Record<string, unknown> | undefined;
    if (summary) {
      if (live(summary.h1_event)) push(`Wyckoff ${summary.h1_event}`, 'H1', `H1 Wyckoff event: ${summary.h1_event}`);
      if (live(summary.m5_qm)) push(`Quasimodo ${summary.m5_qm}`, 'M5', `M5 Quasimodo: ${summary.m5_qm}`);
    }
    if (s.entry_type) {
      const name = s.entry_type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      push(name, 'MULTI', s.reasoning?.slice(0, 120) || name);
    }
  }
  return patterns;
}

/**
 * VPS1 does not currently expose a dedicated fake-liquidity feed; the nearest
 * proxy is "liquidity grab" patterns encoded in signal indicator snapshots.
 * Returns whatever signals ship and dedupes by (level,type).
 */
function extractFakeLiquidity(signals: Vps1Signal[]): FakeLiquiditySignal[] {
  const fakes: FakeLiquiditySignal[] = [];
  const seen = new Set<string>();
  for (const s of signals) {
    const snap = s.indicator_snapshot as Record<string, unknown> | undefined;
    const arr = snap && Array.isArray(snap.fake_liquidity) ? (snap.fake_liquidity as Array<Record<string, unknown>>) : [];
    for (const f of arr) {
      if (!isFiniteNum(f.level)) continue;
      const key = `${f.level}-${f.type}`;
      if (seen.has(key)) continue;
      seen.add(key);
      fakes.push({
        level: f.level,
        type: f.type === 'ABOVE_RESISTANCE' ? 'ABOVE_RESISTANCE' : 'BELOW_SUPPORT',
        strength: isFiniteNum(f.strength) ? f.strength : 0.5,
      });
    }
  }
  return fakes;
}

/**
 * Combine the scanner's higher_tf_bias score with Wyckoff phase votes and
 * signal-consensus weight to land on a final BULLISH / BEARISH / NEUTRAL.
 */
function determineBias(
  signals: Vps1Signal[],
  snapshot: Vps1MarketSnapshot | null,
  ta: Vps1TechnicalAnalysis | null,
): 'BULLISH' | 'BEARISH' | 'NEUTRAL' {
  // Scanner provides a signed score in [-1, 1].
  const scoreBias = snapshot?.scanner?.higher_tf_bias;
  if (isFiniteNum(scoreBias)) {
    if (scoreBias >= 0.5) return 'BULLISH';
    if (scoreBias <= -0.5) return 'BEARISH';
  }

  // Count Wyckoff phase votes across timeframes.
  let bull = 0;
  let bear = 0;
  if (ta?.timeframes) {
    for (const tf of Object.values(ta.timeframes)) {
      const phase = typeof tf.wyckoff_phase === 'string' ? tf.wyckoff_phase.toLowerCase() : '';
      if (phase.includes('accum') || phase.includes('markup') || phase.includes('bull')) bull += 1;
      else if (phase.includes('distrib') || phase.includes('markdown') || phase.includes('bear')) bear += 1;
    }
  }
  if (bull >= bear + 2) return 'BULLISH';
  if (bear >= bull + 2) return 'BEARISH';

  // Signal-consensus fallback.
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

    const currentPrice = isFiniteNum(snapshot?.price?.mid)
      ? snapshot!.price!.mid!
      : isFiniteNum(snapshot?.price?.bid) && isFiniteNum(snapshot?.price?.ask)
        ? ((snapshot!.price!.bid! + snapshot!.price!.ask!) / 2)
        : null;
    const { support, resistance } = extractLevels(uniqueSignals, ta, extras, currentPrice);
    const avgConf = uniqueSignals.length > 0
      ? uniqueSignals.reduce((sum, s) => sum + (s.confidence ?? 0), 0) / uniqueSignals.length
      : (isFiniteNum(snapshot?.scanner?.mtf_confluence) ? snapshot!.scanner!.mtf_confluence! : 0);

    return {
      pair,
      fetchedAt: new Date().toISOString(),
      signals: uniqueSignals,
      supportLevels: support,
      resistanceLevels: resistance,
      sndZones: extractSndZones(uniqueSignals, ta),
      keyPatterns: extractPatterns(uniqueSignals, ta),
      fakeLiquidity: extractFakeLiquidity(uniqueSignals),
      fundamentalBias: determineBias(uniqueSignals, snapshot, ta),
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
