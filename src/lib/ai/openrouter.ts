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

/** Default model for narration, translation, and content tasks. Cheap + fast. */
export const DEFAULT_MODEL = 'google/gemini-2.5-flash-lite';
