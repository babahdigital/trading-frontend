/**
 * AI image generation via OpenRouter.
 *
 * Produces a brand-consistent hero image per blog topic. Uses Flux
 * Schnell by default (~$0.003/image — cheapest high-quality text-to-
 * image model on OpenRouter). Fallbacks: null on any error, so callers
 * can skip setting imageUrl without breaking the article publish path.
 *
 * Storage strategy: base64 data URI saved directly into
 * `Article.imageUrl`. This avoids any external blob store infrastructure
 * and keeps the article self-contained. Trade-off: ~250KB per article
 * body response; acceptable for our scale (10s to 100s of articles).
 * Migrate to R2/S3 when catalog exceeds ~1000 articles.
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('ai-image-generator');

const DEFAULT_MODEL = 'black-forest-labs/flux-1-schnell';
const BRAND_PROMPT_SUFFIX =
  'Style: institutional financial magazine cover, minimalist, dark navy (#0B1220) background, '
  + 'amber (#F5B547) accent highlights, sophisticated, clean, quant-finance aesthetic, '
  + 'professional, editorial photography quality, no text, no typography, no logos, '
  + 'no watermarks, landscape 16:9 composition.';

export interface ImageGenerationOptions {
  /** Override the default model (e.g. 'black-forest-labs/flux-1.1-pro') */
  model?: string;
  /** Image size; flux-schnell best at 1024x1024 */
  size?: '512x512' | '768x512' | '1024x1024' | '1280x720';
  /** Additional context keywords (topic keywords[] array) */
  keywords?: string[];
  /** Category for stylistic hinting */
  category?: string;
  /** Abort signal */
  signal?: AbortSignal;
}

const CATEGORY_HINTS: Record<string, string> = {
  STRATEGY: 'abstract geometric chart patterns, golden ratio, elegant mathematical precision',
  RISK: 'protective barriers, fortress, shield motifs, orderly defensive posture',
  EDUCATION: 'open book, graduation element, knowledge transfer atmosphere',
  CASE_STUDY: 'magnifying glass over market charts, investigative analytical mood',
  COMPLIANCE: 'classical justice scales, formal columns, authoritative presence',
  OPERATIONS: 'blueprint, interconnected network nodes, technical precision',
  RESEARCH: 'laboratory instruments, data visualization, scholarly atmosphere',
  EXECUTION: 'precision machinery, speed trails, systematic flow',
  MARKET_ANALYSIS: 'financial cityscape, analytical charts, market overview',
};

export function buildImagePrompt(
  subject: string,
  options: { category?: string; keywords?: string[] } = {},
): string {
  const { category, keywords } = options;
  const categoryHint = category && CATEGORY_HINTS[category] ? CATEGORY_HINTS[category] : '';
  const keywordHint = keywords && keywords.length > 0
    ? `Incorporating visual motifs of ${keywords.slice(0, 3).join(', ')}.`
    : '';
  return [
    `Professional hero illustration for a financial research article titled: "${subject}".`,
    categoryHint,
    keywordHint,
    BRAND_PROMPT_SUFFIX,
  ]
    .filter(Boolean)
    .join(' ');
}

export interface ImageGenerationResult {
  /** base64 data URI, ready to store in Article.imageUrl */
  dataUri: string;
  /** base64 size in bytes (for cost observability) */
  sizeBytes: number;
  /** model actually used */
  model: string;
}

/**
 * Generate a hero image for an article subject. Returns null on any
 * failure (no API key, HTTP error, malformed response). Safe to call
 * without try/catch in the caller — it never throws.
 */
export async function generateArticleImage(
  subject: string,
  options: ImageGenerationOptions = {},
): Promise<ImageGenerationResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    log.warn('OPENROUTER_API_KEY missing, skipping image generation');
    return null;
  }

  const model = options.model ?? DEFAULT_MODEL;
  const size = options.size ?? '1024x1024';
  const prompt = buildImagePrompt(subject, { category: options.category, keywords: options.keywords });

  try {
    const res = await fetch('https://openrouter.ai/api/v1/images/generations', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
        'X-Title': 'BabahAlgo',
      },
      body: JSON.stringify({
        model,
        prompt,
        n: 1,
        size,
        response_format: 'b64_json',
      }),
      signal: options.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      log.warn(`Image gen HTTP ${res.status} for "${subject.slice(0, 40)}": ${errBody.slice(0, 200)}`);
      return null;
    }

    const body = (await res.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    const first = body?.data?.[0];
    if (!first) {
      log.warn(`Image gen empty data for "${subject.slice(0, 40)}"`);
      return null;
    }

    let base64: string | null = null;
    if (first.b64_json) {
      base64 = first.b64_json;
    } else if (first.url) {
      // Some providers return URL only — fetch + encode.
      const imgRes = await fetch(first.url, { signal: options.signal });
      if (!imgRes.ok) {
        log.warn(`Image URL fetch failed ${imgRes.status} for "${subject.slice(0, 40)}"`);
        return null;
      }
      const buf = await imgRes.arrayBuffer();
      base64 = Buffer.from(buf).toString('base64');
    }

    if (!base64) {
      log.warn(`Image gen returned neither b64_json nor url for "${subject.slice(0, 40)}"`);
      return null;
    }

    const dataUri = `data:image/png;base64,${base64}`;
    return {
      dataUri,
      sizeBytes: base64.length,
      model,
    };
  } catch (err) {
    log.warn(`Image gen error for "${subject.slice(0, 40)}": ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
