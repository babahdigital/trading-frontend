/**
 * Pair Brief AI Generator — Phase 2
 *
 * 3-layer anti-hallucination approach:
 * Layer 1: Template with ONLY real VPS1 data (6 endpoints)
 * Layer 2: Bounded AI via OpenRouter — structured narrative, strict no-invention prompt
 * Layer 3: Post-validation (see pair-brief-validator.ts)
 */

import { generateText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { translateText } from './content';
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

/**
 * Create OpenRouter-backed model.
 * Falls back to Google Gemini if OpenRouter key is not set.
 */
function getModel() {
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey) {
    const openrouter = createOpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: openRouterKey,
    });
    return { model: openrouter('google/gemini-2.0-flash-001'), name: 'openrouter/gemini-2.0-flash' };
  }

  // Fallback to direct Google if available
  const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (googleKey) {
    // Dynamic import to avoid hard dependency
    const { google } = require('@ai-sdk/google');
    return { model: google('gemini-2.0-flash'), name: 'gemini-2.0-flash' };
  }

  return null;
}

function formatPrice(n: number): string {
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
 * Build the technical analysis section from dedicated endpoint data.
 */
function buildTechnicalSection(ta: Vps1TechnicalAnalysis): string {
  const lines: string[] = [];
  lines.push('## Multi-Timeframe Technical Analysis');

  for (const [tfName, tf] of Object.entries(ta.timeframes)) {
    lines.push(`### ${tfName}`);
    lines.push(`Trend: ${tf.trend} | RSI: ${tf.rsi} | MACD: ${tf.macd_signal} | BB: ${tf.bb_position} | EMA: ${tf.ema_alignment}`);
    if (tf.key_levels) {
      if (tf.key_levels.support.length > 0) {
        lines.push(`  Support: ${tf.key_levels.support.map(formatPrice).join(', ')}`);
      }
      if (tf.key_levels.resistance.length > 0) {
        lines.push(`  Resistance: ${tf.key_levels.resistance.map(formatPrice).join(', ')}`);
      }
    }
    if (tf.snd_zones && tf.snd_zones.length > 0) {
      lines.push(`  SND: ${tf.snd_zones.map((z) => `${z.type} ${formatPrice(z.low)}-${formatPrice(z.high)}`).join(', ')}`);
    }
    if (tf.patterns && tf.patterns.length > 0) {
      lines.push(`  Patterns: ${tf.patterns.map((p) => p.name).join(', ')}`);
    }
  }

  if (ta.multi_tf_confluence) {
    const c = ta.multi_tf_confluence;
    lines.push(`\nMulti-TF Confluence: score ${c.score}, bias ${c.dominant_bias}, aligned TFs: ${c.aligned_timeframes.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Build liquidity and session levels section from technical-extras.
 */
function buildLiquiditySection(extras: Vps1TechnicalExtras): string {
  const lines: string[] = [];
  lines.push('## Liquidity & Session Levels');

  if (extras.session_levels) {
    const sl = extras.session_levels;
    lines.push(`Previous Session: High ${formatPrice(sl.prev_high)}, Low ${formatPrice(sl.prev_low)}`);
    lines.push(`Current Session: High ${formatPrice(sl.current_high)}, Low ${formatPrice(sl.current_low)}`);
    if (sl.at_session_level) {
      lines.push(`⚠ Price is AT a session level — expect volatility`);
    }
  }

  if (extras.liquidity_pools && extras.liquidity_pools.length > 0) {
    lines.push(`Liquidity Pools:`);
    for (const pool of extras.liquidity_pools) {
      lines.push(`  ${pool.type} at ${formatPrice(pool.level)} (strength ${pool.strength})`);
    }
  }

  if (extras.order_flow_bias) {
    lines.push(`Order Flow Bias: ${extras.order_flow_bias}`);
  }

  if (extras.institutional_levels && extras.institutional_levels.length > 0) {
    lines.push(`Institutional Levels: ${extras.institutional_levels.map(formatPrice).join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Build market snapshot section.
 */
function buildMarketSnapshotSection(snap: Vps1MarketSnapshot): string {
  const lines: string[] = [];
  lines.push('## Market Snapshot');
  lines.push(`Current Price: ${formatPrice(snap.current_price)}`);
  lines.push(`24h Change: ${snap.price_change_pct >= 0 ? '+' : ''}${snap.price_change_pct.toFixed(2)}% (${formatPrice(snap.price_change_24h)})`);
  lines.push(`24h Range: ${formatPrice(snap.low_24h)} — ${formatPrice(snap.high_24h)}`);
  if (snap.atr_daily) lines.push(`Daily ATR: ${formatPrice(snap.atr_daily)}`);
  if (snap.spread) lines.push(`Spread: ${snap.spread}`);
  if (snap.session_info) {
    lines.push(`Session: ${snap.session_info.current_session}`);
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

  // Liquidity & Session Levels
  if (data.technicalExtras) {
    sections.push(buildLiquiditySection(data.technicalExtras));
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
  const modelInfo = getModel();

  if (!modelInfo) {
    log.warn('No AI API key set (OPENROUTER_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY) — generating template-only brief');
    return { narrative: factualTemplate, narrative_en: null, aiModel: 'template-only', aiTokensUsed: 0 };
  }

  const { model, name: modelName } = modelInfo;
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
