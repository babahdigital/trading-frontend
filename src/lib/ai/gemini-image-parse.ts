/**
 * Shared OpenRouter ⇄ Gemini image-response parser.
 *
 * Gemini 2.5 Flash Image (served via OpenRouter chat/completions with
 * `modalities: ['image','text']`) returns the generated image in several
 * different response shapes depending on the upstream serialization. Both
 * the article image generator (`image-generator.ts`) and the promo hero
 * image generator (`promo-image-generator.ts`) must read it identically.
 *
 * Historically the promo path only handled shape (C). When Gemini returned
 * the image inside `content[]` (shapes A/B/D) the promo parser saw
 * `undefined`, treated it as a failure, and silently fell through to the
 * free Pollinations FLUX fallback — producing the low-fidelity "free"
 * banner Pak Abdullah reported on the Hari Pancasila promo. Centralizing
 * the extraction here is the single source of truth that prevents this
 * drift from recurring.
 *
 * Shapes handled:
 *   A) message.content = [{ type:'image_url', image_url:{ url:'data:...' } }]
 *   B) message.content = [{ type:'image_url', image_url:{ url:'https://...' } }]
 *   C) message.images   = [{ image_url:{ url:'data:...' | 'https://...' } }]
 *   D) message.content = [{ inline_data:{ mime_type:'image/png', data:'base64' } }]
 *   E) message.content = string (text-only, no image) → null
 *
 * Returns the image as either a `data:` URI or an `https:` URL string, or
 * null when no image part is present. Callers decide how to materialize it
 * (Buffer for file save vs base64 data URI for inline storage).
 */

interface GeminiImagePart {
  type?: string;
  image_url?: { url?: string };
  inline_data?: { mime_type?: string; data?: string };
}

interface GeminiMessage {
  content?: string | GeminiImagePart[];
  images?: Array<{ image_url?: { url?: string } }>;
}

interface GeminiBody {
  choices?: Array<{ message?: GeminiMessage }>;
}

export function extractGeminiImageUrl(body: unknown): string | null {
  const message = (body as GeminiBody)?.choices?.[0]?.message;
  if (!message) return null;

  const content = message.content;
  if (Array.isArray(content)) {
    const imgPart = content.find((c) => c?.type === 'image_url' || c?.inline_data);
    if (imgPart?.image_url?.url) return imgPart.image_url.url;
    if (imgPart?.inline_data?.data) {
      const mime = imgPart.inline_data.mime_type || 'image/png';
      return `data:${mime};base64,${imgPart.inline_data.data}`;
    }
  }

  return message.images?.[0]?.image_url?.url ?? null;
}
