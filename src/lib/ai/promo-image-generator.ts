/**
 * Promo hero image generator — terpisah dari article image-generator.ts
 * karena scope berbeda:
 *   - Article images: in-line base64 data URI (catalog kecil, self-contained)
 *   - Promo images: file save ke /public/uploads/promotions/ (R2-friendly,
 *     reusable URL, larger banner format 1024x576)
 *
 * Provider chain (failover):
 *   1. OpenRouter Gemini 2.0 Flash Image — quality good, $0.04/image
 *   2. Pollinations FLUX — free, fallback bila OpenRouter quota / error
 *
 * Theme awareness — strategist provides templateKey (lebaran/natal/hut-ri/
 * black-friday/etc), builder maps ke visual prompt hints (palette, motifs).
 */
import { mkdir, writeFile } from 'fs/promises';
import { randomBytes } from 'crypto';
import path from 'path';
import { createLogger } from '@/lib/logger';
import { extractGeminiImageUrl } from '@/lib/ai/gemini-image-parse';

const log = createLogger('ai/promo-image');

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'promotions');
const POLLINATIONS_BASE = 'https://image.pollinations.ai/prompt';

export interface PromoImageContext {
  templateKey: string;
  promoName: string;
  discountText?: string;
  tierName?: string;
}

const THEME_HINTS: Record<string, string> = {
  lebaran: 'Eid al-Fitr theme, warm golden lights, mosque silhouette, ketupat decorations, family celebration mood, soft warm color palette',
  natal: 'Christmas theme, subtle winter elements, soft snow, warm cozy lights, festive but elegant, gold and deep red palette',
  'tahun-baru': 'New Year celebration, fireworks, midnight sky, countdown atmosphere, optimistic energetic mood, gold and electric blue',
  'hut-ri': 'Indonesian Independence Day, red and white flag elements, monumental architecture, patriotic but modern professional aesthetic',
  imlek: 'Chinese New Year, red lanterns, gold ornaments, prosperity symbols subtle, elegant minimalist',
  waisak: 'Vesak Day, serene Buddhist temple, lotus flower, soft purple and gold, calm spiritual mood',
  'idul-adha': 'Eid al-Adha, peaceful Islamic motifs, gold geometric patterns, warm earth tones',
  nyepi: 'Day of Silence Nyepi, Balinese temple, dark contemplative palette, candle light, mystical mood',
  pancasila: 'Indonesian Pancasila Day, garuda emblem inspiration, red white gold palette, patriotic but modern',
  'black-friday': 'Black Friday sale, dark dramatic background, bold red sale tags, urgent energetic, modern e-commerce aesthetic',
  'cyber-monday': 'Cyber Monday, neon blue and purple gradient, tech-futuristic, holographic',
  'singles-day': 'Singles Day 11.11 shopping festival, vibrant pink-purple, playful modern',
  'harbolnas-1212': 'Indonesian online shopping day 12.12, vibrant gradient red-orange, modern Indonesian commerce',
  'flash-sale': 'Flash sale, lightning energy, urgent red-yellow palette, dynamic motion',
  'fiscal-year': 'New fiscal year, professional business aesthetic, gold and navy, growth chart elements',
  // Indonesia national milestones (added 2026-05-22 audit)
  'hari-buruh': 'Labour Day, dignified workforce silhouettes abstract, navy and red, strong industrial yet warm',
  'hari-pendidikan': 'National Education Day, abstract book and lamp motif, warm sepia and gold, classic scholarly',
  'hari-kartini': 'Kartini Day women empowerment, batik motif abstract, deep amber and crimson, elegant Javanese heritage',
  'hari-anak-nasional': 'National Children Day, soft pastel rainbow palette, playful geometric shapes, hopeful',
  'hari-sumpah-pemuda': 'Youth Pledge Day, red white gold, dynamic forward motion, patriotic modern Indonesian',
  'hari-pahlawan': 'Heroes Day Indonesia, monumental statue silhouette, deep red and bronze, solemn patriotic',
  'hari-ibu': 'Indonesian Mother Day, warm rose and gold, gentle floral abstract, family love mood',
  // International major (added 2026-05-22 audit)
  valentine: 'Valentine Day, deep crimson and rose gold, soft hearts abstract, romantic elegant',
  'womens-day': 'International Womens Day, deep purple and gold mimosa flower abstract, empowering modern',
  easter: 'Easter celebration, soft pastel spring palette, abstract eggs and lily motif, fresh hopeful',
  halloween: 'Halloween, deep purple and orange, atmospheric moonlight, mysterious elegant not scary',
  thanksgiving: 'Thanksgiving harvest, warm autumn palette, abstract wheat and amber leaves, grateful cozy',
  // Welcome / evergreen (added 2026-05-22)
  welcome: 'Welcome onboarding theme, warm amber and navy gradient, abstract open door motif, inviting professional fintech aesthetic',
  evergreen: 'Evergreen offer theme, sophisticated emerald and gold palette, abstract growth chart, perennial trustworthy',
  default: 'Modern fintech promotional banner, professional gold and black palette, abstract trading elements',
};

// Strict no-text rules — FLUX models kadang tetap render garbled text walaupun
// hint negative ringan. Perlu eksplisit + redundant supaya hampir tidak ada
// text artifact. Pak Abdullah feedback 2026-05-21: text di gambar terlihat
// "tulisannya gak jelas" — lebih baik visual murni tanpa teks sama sekali.
//
// Brand suffix untuk Gemini (square 1024×1024) — minta full-bleed edge-to-
// edge composition supaya tidak ada white letterbox padding (Pak Abdullah
// 2026-05-22: "gambar wide sisanya disi background putih"). Gemini akan
// menggambar full canvas tanpa bars kalau prompt eksplisit minta full-bleed.
const BRAND_SUFFIX_SQUARE =
  'BabahAlgo trading platform branding, institutional fintech aesthetic, '
  + 'magazine cover quality, marketing-grade composition, '
  + 'square 1:1 aspect ratio, full-bleed edge-to-edge composition, '
  + 'content fills the entire canvas to all four edges, '
  + 'NO white borders, NO white bars, NO letterboxing, NO padding, '
  + 'NO empty space at top, NO empty space at bottom, NO matte frames, '
  + 'pure visual atmospheric photography, abstract decorative composition, '
  + 'STRICTLY NO text, NO letters, NO words, NO writing, NO typography, '
  + 'NO calligraphy, NO inscription, NO signage, NO numbers, NO digits, '
  + 'NO logos, NO watermark, NO captions, clean visual only';

// Brand suffix untuk Pollinations (wide 1024×576 horizontal banner) —
// Pollinations FLUX honour width/height param di URL, jadi minta 16:9.
const BRAND_SUFFIX_WIDE =
  'BabahAlgo trading platform branding, institutional fintech aesthetic, '
  + 'magazine cover quality, marketing-grade composition, '
  + '16:9 horizontal banner, full-bleed edge-to-edge composition, '
  + 'content fills the entire canvas, NO white borders, NO letterboxing, '
  + 'pure visual atmospheric photography, abstract decorative composition, '
  + 'STRICTLY NO text, NO letters, NO words, NO writing, NO typography, '
  + 'NO calligraphy, NO inscription, NO signage, NO numbers, NO digits, '
  + 'NO logos, NO watermark, NO captions, clean visual only';

// Negative prompt eksplisit untuk Pollinations FLUX — banyak parameter
// "negative" diperlakukan sebagai exclude hints.
const NEGATIVE_PROMPT = 'text, letters, words, typography, writing, '
  + 'calligraphy, signage, inscription, watermark, numbers, digits, '
  + 'logos, captions, subtitles, garbled text, gibberish text, '
  + 'white letterbox bars, empty white borders, matte frame, padded canvas, '
  + 'poor anatomy, low quality, blurry, distorted';

function buildPrompt(ctx: PromoImageContext, format: 'square' | 'wide'): string {
  const themeHint = THEME_HINTS[ctx.templateKey] ?? THEME_HINTS.default;
  const tierLine = ctx.tierName ? `featuring ${ctx.tierName} subscription tier` : '';
  const brandSuffix = format === 'square' ? BRAND_SUFFIX_SQUARE : BRAND_SUFFIX_WIDE;
  return [
    `Promotional artwork for "${ctx.promoName}"`,
    themeHint,
    tierLine,
    brandSuffix,
  ].filter(Boolean).join('. ');
}

async function generateViaPollinations(prompt: string, signal?: AbortSignal): Promise<Buffer> {
  // Append negative prompt langsung ke main prompt — Pollinations tidak punya
  // formal negative parameter, jadi kita instructive negative inline. Tambah
  // `enhance=true` supaya prompt diperbaiki + nofeed untuk private generation.
  const fullPrompt = `${prompt}. AVOID: ${NEGATIVE_PROMPT}`;
  const encoded = encodeURIComponent(fullPrompt);
  const url = `${POLLINATIONS_BASE}/${encoded}?width=1024&height=576&nologo=true&model=flux&private=true&enhance=true&safe=true`;
  const res = await fetch(url, { signal: signal ?? AbortSignal.timeout(90_000) });
  if (!res.ok) throw new Error(`Pollinations HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function generateViaOpenRouter(prompt: string, signal?: AbortSignal): Promise<Buffer | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
        'X-Title': 'BabahAlgo Promo Image',
      },
      body: JSON.stringify({
        // Gemini 2.5 Flash Image — native 1024×1024 square output. Prompt
        // EKSPLISIT minta full-bleed square (NO letterbox) supaya Gemini tidak
        // menggambar "wide banner with white bars" inside square canvas
        // (Pak Abdullah audit 2026-05-22). Sebelumnya prompt menyebut
        // "16:9 banner" → Gemini interpret sebagai letterboxed banner = bug.
        model: 'google/gemini-2.5-flash-image',
        messages: [{
          role: 'user',
          content:
            'Generate a SQUARE 1:1 aspect ratio image (1024×1024). '
            + 'CRITICAL — composition must be FULL-BLEED edge-to-edge: '
            + 'content fills the entire canvas to all four edges, '
            + 'NO white bars at top or bottom, NO letterboxing, NO empty borders, '
            + 'NO matte padding, NO horizontal banner cropped inside square. '
            + 'Imagine the camera frame IS square — compose for square. '
            + 'NO text, NO letters, NO words, NO writing anywhere. '
            + 'Pure visual atmospheric only. '
            + prompt,
        }],
        modalities: ['image', 'text'],
      }),
      signal: signal ?? AbortSignal.timeout(90_000),
    });

    if (!res.ok) {
      log.warn(`OpenRouter HTTP ${res.status}`);
      return null;
    }

    const body = await res.json();
    // Robust multi-shape extraction (shared with the article generator) —
    // Gemini frequently returns the image inside content[] rather than the
    // top-level images[]. Reading only images[] here was the exact cause of
    // the silent Pollinations fallback on promo images (e.g. Hari Pancasila).
    const imageUrl = extractGeminiImageUrl(body);
    if (!imageUrl) {
      // 2xx but no parseable image part (text-only / refusal / unexpected
      // shape). Log it so this case is observable instead of vanishing
      // silently into the free Pollinations fallback.
      log.warn('OpenRouter 2xx but no parseable image — falling back to Pollinations');
      return null;
    }

    if (imageUrl.startsWith('data:image/')) {
      const base64 = imageUrl.split(',')[1];
      return Buffer.from(base64, 'base64');
    }

    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(60_000) });
    if (!imgRes.ok) return null;
    return Buffer.from(await imgRes.arrayBuffer());
  } catch (err) {
    log.warn(`OpenRouter error: ${err instanceof Error ? err.message : 'unknown'}`);
    return null;
  }
}

function detectExt(buf: Buffer): 'png' | 'jpg' | 'webp' {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return 'webp';
  return 'png';
}

export interface PromoImageResult {
  url: string;
  filename: string;
  provider: 'openrouter' | 'pollinations';
  prompt: string;
  sizeBytes: number;
}

export async function generatePromoHeroImage(
  promoSlug: string,
  ctx: PromoImageContext,
): Promise<PromoImageResult> {
  // Two prompts — square untuk Gemini (1024×1024 native), wide untuk
  // Pollinations FLUX (1024×576 via URL param). Each provider gets
  // brand suffix yang sesuai dengan output canvas-nya supaya tidak
  // ada conflicting hint (mis. "16:9" di Gemini = letterbox inside square).
  const squarePrompt = buildPrompt(ctx, 'square');
  const widePrompt = buildPrompt(ctx, 'wide');

  let buffer: Buffer | null = await generateViaOpenRouter(squarePrompt);
  let provider: 'openrouter' | 'pollinations' = 'openrouter';

  if (!buffer) {
    log.info('OpenRouter fail or unavailable, fallback Pollinations…');
    buffer = await generateViaPollinations(widePrompt);
    provider = 'pollinations';
  }

  if (!buffer || buffer.length === 0) {
    throw new Error('All image gen providers failed');
  }

  // Image preserved native (Gemini 2.5 Flash Image 1024×1024 square; Pollinations
  // FLUX 1024×576). NO crop — Pak Abdullah 2026-05-22 concerned about content
  // loss bila crop 1024×1024 → 1024×576 (lotus/temple bisa terpotong). Popup
  // layout adapt ke aspect natural via md:aspect-square (Gemini) atau md:aspect-
  // video (Pollinations 16:9).

  await mkdir(UPLOAD_DIR, { recursive: true });
  const ext = detectExt(buffer);
  const nonce = randomBytes(4).toString('hex');
  const filename = `${promoSlug}-${nonce}.${ext}`;
  const fullPath = path.join(UPLOAD_DIR, filename);
  await writeFile(fullPath, buffer, { mode: 0o644 });

  // API route /api/uploads/promotions/[filename] — Next.js standalone build
  // cache `public/` directory listing saat startup, jadi file yang dibuat
  // runtime (mis. via image gen) tidak ter-detect via static path. API
  // route stream langsung dari disk supaya bypass cache.
  const publicUrl = `/api/uploads/promotions/${filename}`;
  log.info(`Generated promo image slug=${promoSlug} provider=${provider} size=${buffer.length} url=${publicUrl}`);

  // Record prompt actually used by the provider yang akhirnya berhasil
  // (untuk audit / regen reference).
  const usedPrompt = provider === 'openrouter' ? squarePrompt : widePrompt;
  return { url: publicUrl, filename, provider, prompt: usedPrompt, sizeBytes: buffer.length };
}
