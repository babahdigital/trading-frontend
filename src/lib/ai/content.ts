import { generateText } from 'ai';
import { createLogger } from '@/lib/logger';
import { getOpenRouter, DEFAULT_MODEL } from './openrouter';

const log = createLogger('ai-content');

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
 * Translate Indonesian text to English via OpenRouter.
 */
export async function translateText(text: string): Promise<string> {
  const or = getOpenRouter();
  if (!or) {
    log.warn('OPENROUTER_API_KEY not set, skipping translation');
    return '';
  }
  const { text: result } = await generateText({
    model: or(DEFAULT_MODEL),
    prompt: `${TRANSLATE_PROMPT}\n\n${text}`,
    temperature: 0.2,
  });
  return result.trim();
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
  const { text: result } = await generateText({
    model: or(DEFAULT_MODEL),
    prompt: `${ENHANCE_BODY_PROMPT}\n\nData:\n${JSON.stringify(data, null, 2)}`,
    temperature: 0.3,
  });
  return result.trim();
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
