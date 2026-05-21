/**
 * OpenRouter client factory. All AI traffic in this app routes through
 * OpenRouter so we have a single place to manage auth, models, and
 * cost tracking.
 */

import { createOpenAI, type OpenAIProvider } from '@ai-sdk/openai';

let cached: OpenAIProvider | null = null;

export function getOpenRouter(): OpenAIProvider | null {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  if (cached) return cached;
  cached = createOpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey,
    headers: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
      'X-Title': 'BabahAlgo',
    },
  });
  return cached;
}

/** Default model untuk narration, translation, content tasks. Cheap + fast.
 *  Upgraded 2026-05-21 (Pak Abdullah directive): Gemini 2.5 → 3.1 flash-lite,
 *  1M context, improved instruction following + cheaper inference cost. */
export const DEFAULT_MODEL = 'google/gemini-3.1-flash-lite';

/** Premium reasoning model untuk signal advisor, research narrative, edge-case
 *  detection. Upgraded 2026-05-21: Gemini 2.5 → 3.5 flash, lebih baik untuk
 *  multi-step reasoning + long-context analysis. */
export const REASONING_MODEL = 'google/gemini-3.5-flash';
