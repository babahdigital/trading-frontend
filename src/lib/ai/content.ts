import { generateText } from 'ai';
import { createLogger } from '@/lib/logger';
import { getOpenRouter, DEFAULT_MODEL } from './openrouter';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';

const log = createLogger('ai-content');

export interface AiTextResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

async function logAiCall(params: {
  purpose: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  metadata?: Prisma.InputJsonValue;
}): Promise<void> {
  try {
    await prisma.aiCallLog.create({
      data: {
        purpose: params.purpose,
        model: `openrouter/${DEFAULT_MODEL.split('/').pop()}`,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        latencyMs: params.latencyMs,
        success: params.success,
        errorMessage: params.errorMessage,
        metadata: params.metadata ?? {},
      },
    });
  } catch (err) {
    log.warn(`Failed to log AI call: ${err instanceof Error ? err.message : 'unknown'}`);
  }
}

const TRANSLATE_PROMPT = `Translate the following Indonesian text to English.
Context: fintech/trading platform. Keep it professional and institutional.
Only return the translated text, no explanations or additional formatting.`;

const ENHANCE_BODY_PROMPT = `You are a professional fintech research writer for BabahAlgo, an algorithmic trading platform.

Given the following structured data from a weekly trading recap, write a professional research article in Indonesian (Bahasa Indonesia).

Requirements:
- Write 400-600 words in clear, professional Bahasa Indonesia
- Use Markdown formatting (headings, bold, bullet points, tables if data permits)
- Include: Market Overview, Highlights per pair, Key Observations, Risk Notes
- Tone: institutional, data-driven, transparent
- Do NOT add fabricated data — only use what is provided
- If data is sparse, keep the article concise rather than padding

Return ONLY the Markdown article body, no preamble.`;

/**
 * Translate Indonesian text to English via OpenRouter (token-tracked).
 */
export async function translateTextWithUsage(text: string): Promise<AiTextResult> {
  const or = getOpenRouter();
  if (!or) {
    log.warn('OPENROUTER_API_KEY not set, skipping translation');
    return { text: '', inputTokens: 0, outputTokens: 0 };
  }
  const start = Date.now();
  try {
    const { text: result, usage } = await generateText({
      model: or.chat(DEFAULT_MODEL),
      prompt: `${TRANSLATE_PROMPT}\n\n${text}`,
      temperature: 0.2,
    });
    const inputTokens = usage?.inputTokens ?? 0;
    const outputTokens = usage?.outputTokens ?? 0;
    await logAiCall({
      purpose: 'content_translate',
      inputTokens,
      outputTokens,
      latencyMs: Date.now() - start,
      success: true,
    });
    return { text: result.trim(), inputTokens, outputTokens };
  } catch (err) {
    await logAiCall({
      purpose: 'content_translate',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: err instanceof Error ? err.message : 'unknown',
    });
    throw err;
  }
}

/**
 * Translate Indonesian text to English via OpenRouter.
 * Convenience wrapper — returns string only, swallows usage tracking.
 */
export async function translateText(text: string): Promise<string> {
  try {
    const result = await translateTextWithUsage(text);
    return result.text;
  } catch {
    return '';
  }
}

/**
 * Enhance a sparse weekly recap into a full research article body (Indonesian).
 */
export async function enhanceResearchBody(data: {
  week_start: string;
  week_end: string;
  total_signals: number;
  top_pair?: string;
  avg_confidence?: number;
  highlights?: Array<{ pair: string; summary: string }>;
}): Promise<string> {
  const or = getOpenRouter();
  if (!or) {
    log.warn('OPENROUTER_API_KEY not set, skipping body enhancement');
    return '';
  }
  const start = Date.now();
  try {
    const { text: result, usage } = await generateText({
      model: or.chat(DEFAULT_MODEL),
      prompt: `${ENHANCE_BODY_PROMPT}\n\nData:\n${JSON.stringify(data, null, 2)}`,
      temperature: 0.3,
    });
    await logAiCall({
      purpose: 'content_enhance_body',
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      latencyMs: Date.now() - start,
      success: true,
      metadata: { week_start: data.week_start } as Prisma.InputJsonValue,
    });
    return result.trim();
  } catch (err) {
    await logAiCall({
      purpose: 'content_enhance_body',
      inputTokens: 0,
      outputTokens: 0,
      latencyMs: Date.now() - start,
      success: false,
      errorMessage: err instanceof Error ? err.message : 'unknown',
    });
    return '';
  }
}

/**
 * Full pipeline: enhance body if sparse, then translate all fields to English.
 * Returns the _en fields ready to save.
 */
export async function enhanceAndTranslateArticle(fields: {
  title: string;
  excerpt: string;
  body: string;
}): Promise<{ title_en: string; excerpt_en: string; body_en: string }> {
  const [title_en, excerpt_en, body_en] = await Promise.all([
    translateText(fields.title),
    translateText(fields.excerpt),
    translateText(fields.body),
  ]);
  return { title_en, excerpt_en, body_en };
}
