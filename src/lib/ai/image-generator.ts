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

/**
 * Brand style suffix. Pitched as educational technical diagram, NOT
 * decorative magazine cover — the image should EXPLAIN a concept to a
 * trader reading the article.
 */
const BRAND_PROMPT_SUFFIX =
  'Style: clean educational technical diagram, financial chart illustration, '
  + 'annotated candlestick chart OR conceptual data visualization, dark navy (#0B1220) background, '
  + 'amber (#F5B547) highlights on key elements, green and red candles, gridlines subtle, '
  + 'professional trading terminal aesthetic, no text labels, no typography, no watermarks, '
  + 'landscape 16:9 composition, high detail, photorealistic chart rendering.';

export interface ImageGenerationOptions {
  /** Override the default model (e.g. 'black-forest-labs/flux-1.1-pro') */
  model?: string;
  /** Image size; flux-schnell best at 1024x1024 */
  size?: '512x512' | '768x512' | '1024x1024' | '1280x720';
  /** Additional context keywords (topic keywords[] array) */
  keywords?: string[];
  /** Category for stylistic hinting */
  category?: string;
  /** Topic slug — unlocks per-topic visualisation subject mapping */
  slug?: string;
  /** Abort signal */
  signal?: AbortSignal;
}

/**
 * Topic-slug → concrete visualisation subject mapping.
 *
 * Each entry describes WHAT the image should depict for that specific
 * topic, not generic decoration. Example: the Wyckoff article image
 * shows the 4-phase Wyckoff cycle, not abstract fortress art.
 *
 * Slugs not in this map fall back to `CATEGORY_HINTS` and title words.
 */
const SLUG_SUBJECTS: Record<string, string> = {
  'mengapa-90-persen-trader-retail-gagal':
    'dual-pane chart comparison: left shows retail trader erratic entries at local tops and bottoms with red losing candles, right shows institutional systematic entries at structural levels with green winning candles',
  'half-kelly-vs-full-kelly-jane-street':
    'equity growth curve line chart comparing three strategies: Full Kelly (highest peak but deepest drawdowns), Half Kelly (smoother growth), Quarter Kelly (steadiest ascent), with x-axis time and y-axis capital',
  'smc-order-block-panduan-visual-indonesia':
    'candlestick chart showing a Smart Money Concept order block — rectangular highlighted zone marking the last bearish candle before bullish impulsive move, price returning to zone and rejecting with bullish reaction arrow',
  'correlation-guard-portfolio-diversified-1-bet':
    'correlation heatmap matrix of 7x7 currency pairs (EURUSD, GBPUSD, AUDUSD, etc.) with color gradient from red (strong positive correlation) to green (negative correlation), highlighting clusters',
  'atr-adaptive-trailing-stop-renaissance-pattern':
    'candlestick chart with dynamic trailing stop line that adjusts distance based on ATR volatility bands, visible in both low-volatility tight trail and high-volatility wide trail segments',
  'case-study-bot-babahalgo-nfp-januari-2026':
    'candlestick chart showing EURUSD price action across an NFP news event: quiet pre-event range, sharp 80-pip spike spike on release, subsequent consolidation, with vertical marker at the release moment',
  'mengapa-kami-pecah-9-microservices':
    'technical architecture diagram: central monolith splitting into nine interconnected service nodes arranged in a hexagonal cluster, each node labeled with distinct icon for news, signals, indicators, market data, etc., connected by data flow arrows',
  'biaya-hidden-signal-service-slippage-commission-swap':
    'stacked bar chart visualization showing the true cost breakdown of a signal service: small sign-up fee at bottom, larger layers above for slippage, commission, spread, swap, revealing total cost several times higher than the advertised fee',
  'shariah-compliant-algorithmic-trading-panduan':
    'clean split-screen conceptual chart: left side shows a candlestick chart with a green checkmark labeled halal attributes (no swap, moderate leverage, systematic), right side shows the same pair with red X markers on haram attributes (overnight interest, excessive leverage, pure speculation)',
  'roi-calculator-signal-copy-dedicated':
    'comparison dashboard: three columns showing ROI projection curves over 12 months for Signal Service, Copy Trade, and Dedicated VPS, with break-even markers and capital bracket annotations',
};

const CATEGORY_HINTS: Record<string, string> = {
  STRATEGY: 'annotated candlestick pattern chart with structural markings, entries, and target zones',
  RISK: 'risk-return scatter plot or drawdown curve chart with safety threshold lines',
  EDUCATION: 'step-by-step annotated diagram with numbered labels showing concept flow',
  CASE_STUDY: 'real event candlestick chart with pre-event, event, post-event markers',
  COMPLIANCE: 'regulatory framework flowchart with checkmark and cross iconography',
  OPERATIONS: 'system architecture diagram with nodes and data flow connections',
  RESEARCH: 'multi-panel data visualization with charts, histograms, and metrics',
  EXECUTION: 'latency timeline chart or order flow visualization',
  MARKET_ANALYSIS: 'multi-timeframe candlestick chart with support/resistance levels',
};

export function buildImagePrompt(
  subject: string,
  options: { category?: string; keywords?: string[]; slug?: string } = {},
): string {
  const { category, keywords, slug } = options;
  // Priority 1: topic-specific visualisation (known slug)
  const slugSubject = slug && SLUG_SUBJECTS[slug] ? SLUG_SUBJECTS[slug] : null;
  // Priority 2: category-based visualisation hint
  const categoryHint = category && CATEGORY_HINTS[category] ? CATEGORY_HINTS[category] : '';
  // Priority 3: subject keywords
  const keywordHint = keywords && keywords.length > 0
    ? `Visual motifs representing ${keywords.slice(0, 3).join(', ')}.`
    : '';

  const subjectLine = slugSubject
    ? `Technical illustration depicting: ${slugSubject}.`
    : `Technical illustration explaining the concept: "${subject}". ${categoryHint}`;

  return [
    subjectLine,
    !slugSubject ? keywordHint : '',
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
  const prompt = buildImagePrompt(subject, { category: options.category, keywords: options.keywords, slug: options.slug });

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
