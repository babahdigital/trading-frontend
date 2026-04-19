/**
 * Pair Brief AI Generator
 *
 * 3-layer anti-hallucination approach:
 * Layer 1: Template with ONLY real VPS1 data
 * Layer 2: Bounded AI — narrative only, strict no-invention prompt
 * Layer 3: Post-validation (see pair-brief-validator.ts)
 */

import { generateText } from 'ai';
import { google } from '@ai-sdk/google';
import { translateText } from './content';
import { createLogger } from '@/lib/logger';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import type { PairDataBundle, SndZone, KeyPattern, FakeLiquiditySignal, TradeIdeaRaw } from '@/lib/vps1/pair-data';

const log = createLogger('pair-brief-gen');
const MODEL = google('gemini-2.0-flash');

function formatPrice(n: number): string {
  return n >= 100 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n.toFixed(5);
}

function formatLevels(levels: number[]): string {
  if (levels.length === 0) return 'N/A';
  return levels.map(formatPrice).join(' | ');
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
 * Build the factual data template for the AI prompt.
 * This is Layer 1 — only real VPS1 data.
 */
function buildFactualTemplate(data: PairDataBundle, session: string): string {
  return `## FACTUAL DATA (do not modify or add to these):
Pair: ${data.pair}
Session: ${session}
Date: ${new Date().toISOString().split('T')[0]}

Support Levels: ${formatLevels(data.supportLevels)}
Resistance Levels: ${formatLevels(data.resistanceLevels)}
SND Zones: ${formatSndZones(data.sndZones)}
Key Patterns: ${formatPatterns(data.keyPatterns)}
Fake Liquidity Signals: ${formatFakeLiquidity(data.fakeLiquidity)}
Fundamental Bias: ${data.fundamentalBias} (${data.signals.filter(s => s.direction === 'BUY').length} BUY, ${data.signals.filter(s => s.direction === 'SELL').length} SELL, avg confidence ${data.avgConfidence})
Total Signals Analyzed: ${data.signals.length}

Trade Ideas:
${formatTradeIdeas(data.tradeIdeas)}`;
}

const NARRATIVE_PROMPT = `You are the research desk at BabahAlgo, an institutional-grade algorithmic trading platform.

Write a professional Pair Intelligence Brief in Bahasa Indonesia based EXCLUSIVELY on the factual data provided below.

STRICT RULES:
1. Do NOT invent, estimate, or hallucinate ANY price levels, percentages, timeframes, or data not explicitly listed in the FACTUAL DATA section.
2. Do NOT add opinions on fundamentals, news events, or external factors unless they appear in the data.
3. If data is sparse (few signals or no SND zones), write a shorter, more cautious brief. Never pad.
4. Use Markdown formatting: headings (##), bold, bullet points.
5. Structure: Ringkasan Sesi → Level Kunci → Zona SND → Pola Teknikal → Ide Trading → Catatan Risiko
6. Tone: institutional, data-driven, transparent.
7. Keep it 300-500 words.
8. Every number you mention MUST appear in the FACTUAL DATA section.

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
  const modelName = 'gemini-2.0-flash';

  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    log.warn('GOOGLE_GENERATIVE_AI_API_KEY not set — generating template-only brief');
    const fallback = buildFactualTemplate(data, session);
    return { narrative: fallback, narrative_en: null, aiModel: 'template-only', aiTokensUsed: 0 };
  }

  const factualTemplate = buildFactualTemplate(data, session);
  const fullPrompt = `${NARRATIVE_PROMPT}\n${factualTemplate}`;

  // Layer 2: Generate narrative with Gemini
  const start = Date.now();
  let narrative: string;
  let totalTokens = 0;

  try {
    const result = await generateText({
      model: MODEL,
      prompt: fullPrompt,
      temperature: 0.2, // Low creativity — we want factual narrative
    });
    narrative = result.text.trim();
    totalTokens = (result.usage?.totalTokens ?? 0);

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
