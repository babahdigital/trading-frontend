import { streamText, convertToModelMessages } from 'ai';
import { buildSystemPrompt, type ChatLocale } from '@/lib/chat/system-prompt';
import { getOpenRouter, DEFAULT_MODEL } from '@/lib/ai/openrouter';
import { createLogger } from '@/lib/logger';

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

  try {
    const result = streamText({
      model: or(DEFAULT_MODEL),
      system: buildSystemPrompt(locale),
      messages: await convertToModelMessages(messages),
      maxOutputTokens: 500,
      temperature: 0.3,
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
