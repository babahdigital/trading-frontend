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

/**
 * Image generation provider.
 *
 * Pollinations.ai is the default: free, no API key, supports Flux,
 * returns PNG binary directly via URL. Reliable for MVP throughput
 * (10-100 images/day). Migrate to paid provider (fal.ai / Replicate)
 * when free tier rate-limits hit.
 */
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';
const DEFAULT_MODEL = 'flux'; // Pollinations model name

/**
 * Brand style suffix — institutional editorial illustration style.
 *
 * Sebelumnya prompt minta "Bloomberg trading terminal photography" yang
 * sering bikin Flux halu (chart fake yang terlihat aneh / angka ngaco).
 * Pak Abdullah feedback "gambar betul betul jelek, halu — pakai standar
 * institusional jangan halu".
 *
 * Sekarang revamp: minta editorial illustration ala Financial Times /
 * Harvard Business Review — geometri abstract, line work, minimal palette,
 * NO fake chart data. Lebih aman dari halusinasi karena tidak meminta
 * text/angka spesifik yang Flux sering generate jelek.
 */
const BRAND_PROMPT_SUFFIX =
  'Style: minimalist editorial illustration in the style of Financial Times '
  + 'and Harvard Business Review covers, abstract geometric composition, '
  + 'institutional editorial design, NOT a photograph and NOT a literal trading screen. '
  + 'Color palette: deep navy (#0B1220) primary, warm amber (#F5B547) accent, '
  + 'soft warm paper (#F2F1EA) highlight tones, restrained 3-color palette only. '
  + 'Visual language: clean vector-like line art, balanced negative space, '
  + 'subtle geometric forms (circles, rectangles, parallels) suggesting structure '
  + 'and discipline, NO chart-like content, NO numbers, NO text, NO logos, '
  + 'NO candlestick imagery, NO trading screen UI. '
  + 'Lighting: flat editorial design with subtle gradient depth, '
  + 'magazine cover quality, museum-grade restraint, premium quant-finance journal aesthetic. '
  + 'Format: 16:9 horizontal landscape composition, magazine cover proportions.';

export interface ImageGenerationOptions {
  /** Pollinations model: 'flux' (default, best quality) | 'turbo' (faster, lower quality) */
  model?: string;
  /** Image size; default upgraded to 1920x1080 for premium quality */
  size?: '1024x1024' | '1280x720' | '1536x864' | '1920x1080';
  /** Additional context keywords (topic keywords[] array) */
  keywords?: string[];
  /** Category for stylistic hinting */
  category?: string;
  /** Topic slug — unlocks per-topic visualisation subject mapping */
  slug?: string;
  /** Deterministic seed (same seed + same prompt = same image) */
  seed?: number;
  /** If true, requests private (uncached) generation */
  private?: boolean;
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

// Category hints — pakai abstract editorial visual cues, BUKAN chart literal
// supaya Flux tidak halusinasi data fake. Mirror Harvard Business Review +
// Financial Times cover art style.
const CATEGORY_HINTS: Record<string, string> = {
  STRATEGY: 'abstract geometric composition suggesting pattern recognition: overlapping rectangles forming a coherent structure',
  RISK: 'concentric circles or balanced scales motif suggesting controlled boundaries and equilibrium',
  EDUCATION: 'minimalist diagram of three to five connected nodes, like a thought-map without text',
  CASE_STUDY: 'two-tone before-after split composition with subtle directional arrows',
  COMPLIANCE: 'restrained checkmark and balanced framework illustration with geometric structure',
  OPERATIONS: 'abstract network of interconnected dots forming a hexagonal cluster, like infrastructure schema',
  RESEARCH: 'overlapping translucent geometric panels suggesting layered analysis',
  EXECUTION: 'horizontal flowing lines converging to a precise focal point, suggesting fast precision',
  MARKET_ANALYSIS: 'wave-like horizontal forms suggesting market dynamics without literal chart data',
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
 * failure — safe to call without try/catch; never throws.
 *
 * Provider: Pollinations.ai (free, no key, Flux model). Returns image
 * as PNG binary via URL; we fetch + base64 encode for storage in
 * Article.imageUrl as data URI.
 */
export async function generateArticleImage(
  subject: string,
  options: ImageGenerationOptions = {},
): Promise<ImageGenerationResult | null> {
  const model = options.model ?? DEFAULT_MODEL;
  // Default upgraded to 1536x864 — premium quality without massive bandwidth.
  // Articles with high-impact slugs may override to 1920x1080.
  const size = options.size ?? '1536x864';
  const [widthStr, heightStr] = size.split('x');
  const width = parseInt(widthStr, 10);
  const height = parseInt(heightStr, 10);
  const seed = options.seed ?? Math.floor(Math.random() * 1_000_000);

  const prompt = buildImagePrompt(subject, { category: options.category, keywords: options.keywords, slug: options.slug });

  // Pollinations accepts prompt in URL path (encoded). Query params
  // control size, seed, model, nologo, enhance (prompt expansion via LLM).
  const url = new URL(`${POLLINATIONS_BASE}/${encodeURIComponent(prompt)}`);
  url.searchParams.set('width', String(width));
  url.searchParams.set('height', String(height));
  url.searchParams.set('seed', String(seed));
  url.searchParams.set('model', model);
  url.searchParams.set('nologo', 'true');
  url.searchParams.set('enhance', 'true');
  if (options.private) url.searchParams.set('private', 'true');

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: options.signal,
      headers: { Accept: 'image/*' },
    });

    if (!res.ok) {
      log.warn(`Image gen HTTP ${res.status} for "${subject.slice(0, 40)}"`);
      return null;
    }

    const contentType = res.headers.get('content-type') ?? 'image/png';
    if (!contentType.startsWith('image/')) {
      log.warn(`Image gen unexpected content-type ${contentType} for "${subject.slice(0, 40)}"`);
      return null;
    }

    const buf = await res.arrayBuffer();
    if (buf.byteLength < 1000) {
      // Pollinations sometimes returns a tiny error image; guard against
      log.warn(`Image gen suspiciously small (${buf.byteLength} bytes) for "${subject.slice(0, 40)}"`);
      return null;
    }

    const base64 = Buffer.from(buf).toString('base64');
    const ext = contentType.includes('jpeg') ? 'jpeg' : contentType.includes('webp') ? 'webp' : 'png';
    const dataUri = `data:${contentType.split(';')[0]};base64,${base64}`;

    log.info(`Generated image ${ext} ${buf.byteLength} bytes via pollinations/${model} for "${subject.slice(0, 40)}"`);

    return {
      dataUri,
      sizeBytes: buf.byteLength,
      model: `pollinations/${model}`,
    };
  } catch (err) {
    log.warn(`Image gen error for "${subject.slice(0, 40)}": ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}
