import { streamText, convertToModelMessages } from 'ai';
import { buildSystemPrompt, type ChatLocale } from '@/lib/chat/system-prompt';
import { getOpenRouter, DEFAULT_MODEL } from '@/lib/ai/openrouter';
import { createLogger } from '@/lib/logger';
import { resolveAuthenticatedContext } from '@/lib/chat/auth-context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/chat');

function resolveLocale(request: Request, fromBody: unknown): ChatLocale {
  if (fromBody === 'id' || fromBody === 'en') return fromBody;
  // Cookie set by middleware geo-ip detection
  const cookie = request.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)NEXT_LOCALE=(id|en)/);
  if (match) return match[1] as ChatLocale;
  // Accept-Language fallback: 'id' if Indonesian preferred
  const accept = (request.headers.get('accept-language') ?? '').toLowerCase();
  if (accept.startsWith('id') || accept.includes(',id;') || accept.includes(',id,')) return 'id';
  return 'en';
}

export async function POST(request: Request) {
  let body: { messages?: unknown; locale?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    return jsonError(400, 'invalid_json', { id: 'JSON tidak valid.', en: 'Invalid JSON body.' }, 'en');
  }

  const messages = Array.isArray(body.messages) ? body.messages : null;
  if (!messages) {
    return jsonError(400, 'invalid_messages', { id: 'Pesan tidak valid.', en: 'Invalid messages payload.' }, 'en');
  }

  const locale = resolveLocale(request, body.locale);

  // Extract last 3 user messages text for skill detection (forex vs crypto vs both).
  // Lazy-loading skill memodul menghemat token budget signifikan saat pertanyaan
  // sempit ke salah satu domain.
  const recentUserText = (Array.isArray(messages) ? messages : [])
    .slice(-3)
    .filter((m: unknown) => (m as { role?: string }).role === 'user')
    .map((m: unknown) => {
      const parts = (m as { parts?: Array<{ type?: string; text?: string }> }).parts;
      if (!Array.isArray(parts)) return '';
      return parts.filter((p) => p.type === 'text').map((p) => p.text || '').join(' ');
    })
    .join(' ');

  // Authenticated context — kalau session valid, AI bisa kenali user + state.
  const authenticated = await resolveAuthenticatedContext(request).catch(() => undefined);

  const or = getOpenRouter();
  if (!or) {
    log.warn('OPENROUTER_API_KEY missing — chat disabled');
    return jsonError(
      503,
      'ai_unconfigured',
      {
        id: 'Asisten AI sementara tidak tersedia. Silakan hubungi tim kami melalui /contact.',
        en: 'AI assistant is temporarily unavailable. Please reach out via /contact.',
      },
      locale,
    );
  }

  // Per Zero Touch mandate: fall back fast (<= 8s) so the UI does not hang
  // on a stalled provider. Headers commit at first chunk; once streaming
  // starts we let the SDK manage its own timeout. This race only protects
  // the pre-flight (model resolution, network connect).
  const PREFLIGHT_TIMEOUT_MS = 8000;

  try {
    const result = streamText({
      // PENTING: pakai or.chat(...) bukan or(...). Default shortcut or(...)
      // akan resolve ke Responses API yang TIDAK didukung OpenRouter — error
      // "Invalid Responses API request" muncul saat ada history > 1 message.
      // or.chat(...) pakai Chat Completions API yang kompatibel dengan
      // OpenRouter (dan semua model yang di-proxy via OpenRouter).
      model: or.chat(DEFAULT_MODEL),
      system: buildSystemPrompt({ locale, recentUserText, authenticated }),
      messages: await convertToModelMessages(messages),
      // 400 token = ~1-3 paragraf singkat. Force brevity per FORMAT_RULES
      // di skill identity. Naikkan kalau user spesifik minta detail panjang.
      maxOutputTokens: 400,
      temperature: 0.3,
      abortSignal: AbortSignal.timeout(PREFLIGHT_TIMEOUT_MS + 30_000),
    });
    return result.toUIMessageStreamResponse();
  } catch (err) {
    log.error(`Chat upstream error: ${err instanceof Error ? err.message : 'unknown'}`);
    return jsonError(
      503,
      'ai_upstream_error',
      {
        id: 'Asisten AI sedang kesulitan menjawab. Silakan coba lagi sebentar lagi.',
        en: 'The AI assistant is having trouble responding. Please try again shortly.',
      },
      locale,
    );
  }
}

function jsonError(status: number, code: string, message: { id: string; en: string }, locale: ChatLocale) {
  return new Response(
    JSON.stringify({ error: code, message: message[locale] }),
    { status, headers: { 'Content-Type': 'application/json' } },
  );
}
