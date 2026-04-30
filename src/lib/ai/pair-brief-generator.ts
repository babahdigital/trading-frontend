/**
 * Pair Brief AI Generator — Phase 2
 *
 * 3-layer anti-hallucination approach:
 * Layer 1: Template with ONLY real VPS1 data (6 endpoints)
 * Layer 2: Bounded AI via OpenRouter — structured narrative, strict no-invention prompt
 * Layer 3: Post-validation (see pair-brief-validator.ts)
 */

import { generateText } from 'ai';
import { translateText } from './content';
import { getOpenRouter, DEFAULT_MODEL } from './openrouter';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type {
  PairDataBundle,
  SndZone,
  KeyPattern,
  FakeLiquiditySignal,
  TradeIdeaRaw,
} from '@/lib/vps1/pair-data';
import type {
  Vps1TechnicalAnalysis,
  Vps1TechnicalExtras,
  Vps1MarketSnapshot,
  Vps1Calendar,
} from '@/lib/vps1/client';

const log = createLogger('pair-brief-gen');

const MODEL_NAME = `openrouter/${DEFAULT_MODEL.split('/').pop()}`;

function formatPrice(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 'N/A';
  return n >= 100 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n.toFixed(5);
}

function formatLevels(levels: number[]): string {
  if (levels.length === 0) return 'N/A';
  return levels.slice(0, 8).map(formatPrice).join(' | ');
}

function formatSndZones(zones: SndZone[]): string {
  if (zones.length === 0) return 'None detected';
  return zones.map((z) => `[${z.type} ${formatPrice(z.low)}-${formatPrice(z.high)} ${z.tf}]`).join(' ');
}

function formatPatterns(patterns: KeyPattern[]): string {
  if (patterns.length === 0) return 'None detected';
  return patterns.map((p) => `[${p.name} at ${p.tf}: ${p.description}]`).join(' ');
}

function formatFakeLiquidity(fakes: FakeLiquiditySignal[]): string {
  if (fakes.length === 0) return 'None detected';
  return fakes.map((f) => `[${f.type} at ${formatPrice(f.level)}, strength ${f.strength}]`).join(' ');
}

function formatTradeIdeas(ideas: TradeIdeaRaw[]): string {
  if (ideas.length === 0) return 'No high-confidence trade ideas available.';
  return ideas.map((t, i) =>
    `${i + 1}. ${t.direction} at ${formatPrice(t.entry)}, SL ${formatPrice(t.sl)}, TP ${formatPrice(t.tp)} (conf ${t.confidence}) — ${t.rationale}`
  ).join('\n');
}

/**
 * Build the technical analysis section from the real VPS1 schema.
 *
 * VPS1 exposes per-timeframe Wyckoff / Quasimodo / SMC fields rather than
 * classic TA indicators, so the section surfaces those directly: Wyckoff
 * phase + event, market structure (BOS/CHoCH), nearest demand & supply
 * zones, nearest S/R, and directional targets when present.
 */
function buildTechnicalSection(ta: Vps1TechnicalAnalysis): string {
  const lines: string[] = [];
  lines.push('## Multi-Timeframe Technical Analysis');

  for (const [tfName, tf] of Object.entries(ta.timeframes)) {
    const tfLabel = (tf.timeframe || tfName).toUpperCase();
    lines.push(`### ${tfLabel}`);

    const header: string[] = [];
    if (tf.wyckoff_phase) header.push(`Wyckoff phase: ${tf.wyckoff_phase}`);
    if (tf.wyckoff_event && tf.wyckoff_event !== 'none') header.push(`event: ${tf.wyckoff_event}`);
    if (tf.market_structure) header.push(`structure: ${tf.market_structure}`);
    if (tf.last_bos) header.push(`last BOS: ${tf.last_bos}`);
    if (tf.last_choch) header.push(`last CHoCH: ${tf.last_choch}`);
    if (typeof tf.atr === 'number') header.push(`ATR ${formatPrice(tf.atr)}`);
    if (header.length > 0) lines.push(header.join(' | '));

    const levels: string[] = [];
    if (typeof tf.nearest_support === 'number') levels.push(`nearest S ${formatPrice(tf.nearest_support)}`);
    if (typeof tf.nearest_resistance === 'number') levels.push(`nearest R ${formatPrice(tf.nearest_resistance)}`);
    if (typeof tf.swing_high_1 === 'number') levels.push(`swing hi ${formatPrice(tf.swing_high_1)}`);
    if (typeof tf.swing_low_1 === 'number') levels.push(`swing lo ${formatPrice(tf.swing_low_1)}`);
    if (levels.length > 0) lines.push(`  Levels: ${levels.join(', ')}`);

    const zones: string[] = [];
    if (typeof tf.nearest_demand_top === 'number' && typeof tf.nearest_demand_bottom === 'number') {
      zones.push(`Demand ${formatPrice(tf.nearest_demand_bottom)}–${formatPrice(tf.nearest_demand_top)}`);
    }
    if (typeof tf.nearest_supply_top === 'number' && typeof tf.nearest_supply_bottom === 'number') {
      zones.push(`Supply ${formatPrice(tf.nearest_supply_bottom)}–${formatPrice(tf.nearest_supply_top)}`);
    }
    if (zones.length > 0) lines.push(`  Zones: ${zones.join(', ')}`);

    const targets: string[] = [];
    if (typeof tf.bullish_target === 'number') targets.push(`bullish ${formatPrice(tf.bullish_target)}`);
    if (typeof tf.bearish_target === 'number') targets.push(`bearish ${formatPrice(tf.bearish_target)}`);
    if (targets.length > 0) lines.push(`  Targets: ${targets.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Build liquidity section from Fibonacci retracements + FVG data in TA.
 */
function buildLiquiditySection(extras: Vps1TechnicalExtras, ta: Vps1TechnicalAnalysis | null): string {
  const lines: string[] = [];
  lines.push('## Liquidity & Fibonacci Structure');

  if (extras.fibonacci) {
    for (const [tfName, fib] of Object.entries(extras.fibonacci)) {
      const TF = tfName.toUpperCase();
      const parts: string[] = [];
      if (fib.trend) parts.push(`trend ${fib.trend}`);
      if (typeof fib.swing_low === 'number' && typeof fib.swing_high === 'number') {
        parts.push(`swing ${formatPrice(fib.swing_low)}–${formatPrice(fib.swing_high)}`);
      }
      if (parts.length > 0) lines.push(`### ${TF} Fib — ${parts.join(', ')}`);
      const retrs = (fib.retracements ?? []).filter((r) => typeof r.price === 'number').slice(0, 5);
      if (retrs.length > 0) {
        lines.push(`  Retracements: ${retrs.map((r) => `${r.label} @ ${formatPrice(r.price)} (${r.role})`).join(', ')}`);
      }
    }
  }

  if (ta?.timeframes) {
    const gaps: string[] = [];
    for (const [tfName, tf] of Object.entries(ta.timeframes)) {
      const TF = tfName.toUpperCase();
      if (typeof tf.nearest_fvg_bull_top === 'number' && typeof tf.nearest_fvg_bull_bottom === 'number') {
        gaps.push(`${TF} bullish FVG ${formatPrice(tf.nearest_fvg_bull_bottom)}–${formatPrice(tf.nearest_fvg_bull_top)}`);
      }
      if (typeof tf.nearest_fvg_bear_top === 'number' && typeof tf.nearest_fvg_bear_bottom === 'number') {
        gaps.push(`${TF} bearish FVG ${formatPrice(tf.nearest_fvg_bear_bottom)}–${formatPrice(tf.nearest_fvg_bear_top)}`);
      }
    }
    if (gaps.length > 0) lines.push(`Fair Value Gaps: ${gaps.join(' | ')}`);
  }

  return lines.length > 1 ? lines.join('\n') : '';
}

/**
 * Build market snapshot section from the real VPS1 schema (price.mid, atr.d1,
 * scanner.higher_tf_bias, session.active_window).
 */
function buildMarketSnapshotSection(snap: Vps1MarketSnapshot): string {
  const lines: string[] = [];
  lines.push('## Market Snapshot');
  const mid = snap.price?.mid;
  const bid = snap.price?.bid;
  const ask = snap.price?.ask;
  if (typeof mid === 'number') {
    lines.push(`Current Price (mid): ${formatPrice(mid)}`);
  } else if (typeof bid === 'number' && typeof ask === 'number') {
    lines.push(`Current Price: bid ${formatPrice(bid)} / ask ${formatPrice(ask)}`);
  }
  if (typeof snap.price?.spread_points === 'number') {
    lines.push(`Spread: ${snap.price.spread_points} points`);
  }
  if (typeof snap.atr?.d1 === 'number') {
    lines.push(`Daily ATR: ${formatPrice(snap.atr.d1)}`);
  }
  if (snap.atr?.regime) {
    lines.push(`Volatility regime: ${snap.atr.regime}`);
  }
  if (snap.session?.active_window) {
    lines.push(`Session: ${snap.session.active_window}${snap.session.market_open ? ' (open)' : ' (closed)'}`);
  }
  if (snap.scanner) {
    const s = snap.scanner;
    const scoreParts: string[] = [];
    if (typeof s.score === 'number') scoreParts.push(`overall ${s.score.toFixed(2)}`);
    if (typeof s.mtf_confluence === 'number') scoreParts.push(`MTF confluence ${s.mtf_confluence.toFixed(2)}`);
    if (typeof s.higher_tf_bias === 'number') scoreParts.push(`higher-TF bias ${s.higher_tf_bias.toFixed(2)}`);
    if (typeof s.smc_score === 'number') scoreParts.push(`SMC ${s.smc_score.toFixed(2)}`);
    if (scoreParts.length > 0) lines.push(`Scanner: ${scoreParts.join(', ')}`);
    if (s.reason_label) lines.push(`Scanner reason: ${s.reason_label}`);
  }
  return lines.join('\n');
}

/**
 * Build calendar events section.
 */
function buildCalendarSection(cal: Vps1Calendar): string {
  if (!cal.events || cal.events.length === 0) return '';
  const lines: string[] = [];
  lines.push('## Economic Calendar');
  const highImpact = cal.events.filter((e) => e.impact === 'HIGH');
  const medImpact = cal.events.filter((e) => e.impact === 'MEDIUM');

  if (highImpact.length > 0) {
    lines.push('HIGH IMPACT:');
    for (const e of highImpact) {
      lines.push(`  ${e.time} — ${e.currency} ${e.event}${e.forecast ? ` (forecast: ${e.forecast})` : ''}`);
    }
  }
  if (medImpact.length > 0) {
    lines.push('MEDIUM IMPACT:');
    for (const e of medImpact.slice(0, 5)) {
      lines.push(`  ${e.time} — ${e.currency} ${e.event}`);
    }
  }
  return lines.join('\n');
}

/**
 * Build the complete factual data template for the AI prompt.
 * Layer 1 — only real VPS1 data from all 6 endpoints.
 */
function buildFactualTemplate(data: PairDataBundle, session: string): string {
  const sections: string[] = [];

  sections.push(`## FACTUAL DATA (do not modify or add to these):
Pair: ${data.pair}
Session: ${session}
Date: ${new Date().toISOString().split('T')[0]}`);

  // Market Snapshot
  if (data.marketSnapshot) {
    sections.push(buildMarketSnapshotSection(data.marketSnapshot));
  }

  // Calendar
  if (data.calendar) {
    const calSection = buildCalendarSection(data.calendar);
    if (calSection) sections.push(calSection);
  }

  // Multi-TF Technical Analysis
  if (data.technicalAnalysis) {
    sections.push(buildTechnicalSection(data.technicalAnalysis));
  }

  // Liquidity & Fibonacci structure (pulls from technical-extras + TA FVGs)
  if (data.technicalExtras) {
    const liquiditySection = buildLiquiditySection(data.technicalExtras, data.technicalAnalysis);
    if (liquiditySection) sections.push(liquiditySection);
  }

  // Legacy signal-extracted data (always present)
  sections.push(`## Consolidated Levels
Support Levels: ${formatLevels(data.supportLevels)}
Resistance Levels: ${formatLevels(data.resistanceLevels)}
SND Zones: ${formatSndZones(data.sndZones)}
Key Patterns: ${formatPatterns(data.keyPatterns)}
Fake Liquidity Signals: ${formatFakeLiquidity(data.fakeLiquidity)}
Fundamental Bias: ${data.fundamentalBias} (${data.signals.filter((s) => s.direction === 'BUY').length} BUY, ${data.signals.filter((s) => s.direction === 'SELL').length} SELL, avg confidence ${data.avgConfidence})
Total Signals Analyzed: ${data.signals.length}`);

  sections.push(`## Trade Ideas
${formatTradeIdeas(data.tradeIdeas)}`);

  return sections.join('\n\n');
}

const NARRATIVE_PROMPT = `You are the research desk at BabahAlgo, an institutional-grade algorithmic trading platform.

Write a professional Pair Intelligence Brief in Bahasa Indonesia based EXCLUSIVELY on the factual data provided below.

STRUCTURE your output with these 6 sections:
1. **Ringkasan Eksekutif** — 2-3 sentence overview of current market state and dominant bias
2. **Konteks Sesi** — Current session, session levels, any economic events upcoming
3. **Analisis Fundamental** — Bias direction with signal consensus support
4. **Struktur Teknikal** — Multi-timeframe analysis, S/R levels, SND zones, patterns detected
5. **Interpretasi Likuiditas** — Liquidity pools, fake-out risks, session level proximity
6. **Skenario Trading** — Trade scenarios with specific entry/SL/TP from the data, risk notes

STRICT RULES:
1. Do NOT invent, estimate, or hallucinate ANY price levels, percentages, timeframes, or data not explicitly listed in the FACTUAL DATA section.
2. Do NOT add opinions on fundamentals, news events, or external factors unless they appear in the data.
3. If data is sparse (few signals or missing sections), write a shorter, more cautious brief. Never pad.
4. Use Markdown formatting: headings (##), bold, bullet points.
5. Tone: institutional, data-driven, transparent.
6. Keep it 400-700 words.
7. Every number you mention MUST appear in the FACTUAL DATA section.
8. If economic calendar has HIGH impact events, mention them as risk factors in Skenario Trading.

`;

/**
 * Log AI call to database.
 */
async function logAiCall(params: {
  purpose: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.aiCallLog.create({ data: params });
  } catch (err) {
    log.warn(`Failed to log AI call: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

export interface GeneratedBrief {
  narrative: string;
  narrative_en: string | null;
  aiModel: string;
  aiTokensUsed: number;
}

/**
 * Generate narrative for a pair brief from VPS1 data.
 */
export async function generatePairBriefNarrative(
  data: PairDataBundle,
  session: string,
): Promise<GeneratedBrief> {
  const factualTemplate = buildFactualTemplate(data, session);
  const or = getOpenRouter();

  if (!or) {
    log.warn('OPENROUTER_API_KEY not set — generating template-only brief');
    return { narrative: factualTemplate, narrative_en: null, aiModel: 'template-only', aiTokensUsed: 0 };
  }

  const model = or.chat(DEFAULT_MODEL);
  const modelName = MODEL_NAME;
  const fullPrompt = `${NARRATIVE_PROMPT}\n${factualTemplate}`;

  // Layer 2: Generate narrative
  const start = Date.now();
  let narrative: string;
  let totalTokens = 0;

  try {
    const result = await generateText({
      model,
      prompt: fullPrompt,
      temperature: 0.2,
    });
    narrative = result.text.trim();
    totalTokens = result.usage?.totalTokens ?? 0;

    await logAiCall({
      purpose: 'pair_brief_narrative',
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      success: true,
      metadata: { pair: data.pair, session, totalTokens } as Prisma.InputJsonValue,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    log.error('Narrative generation failed:', msg);
    await logAiCall({
      purpose: 'pair_brief_narrative',
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: msg,
    });
    // Fallback to template
    return { narrative: factualTemplate, narrative_en: null, aiModel: 'template-fallback', aiTokensUsed: 0 };
  }

  // Translate to English
  let narrative_en: string | null = null;
  const translateStart = Date.now();
  try {
    narrative_en = await translateText(narrative);
    if (!narrative_en) narrative_en = null;
    await logAiCall({
      purpose: 'pair_brief_translate',
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - translateStart,
      success: true,
      metadata: { pair: data.pair, session } as Prisma.InputJsonValue,
    });
  } catch (err) {
    log.warn(`Translation failed for ${data.pair} brief: ${err instanceof Error ? err.message : 'unknown'}`);
    await logAiCall({
      purpose: 'pair_brief_translate',
      model: modelName,
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - translateStart,
      success: false,
      errorMessage: err instanceof Error ? err.message : 'unknown',
    });
  }

  return {
    narrative,
    narrative_en,
    aiModel: modelName,
    aiTokensUsed: totalTokens,
  };
}
