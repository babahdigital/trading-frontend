import { streamText, convertToModelMessages } from 'ai';
import { BABAH_SYSTEM_PROMPT } from '@/lib/chat/system-prompt';
import { getOpenRouter, DEFAULT_MODEL } from '@/lib/ai/openrouter';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const or = getOpenRouter();
  if (!or) {
    return new Response('AI is not configured (OPENROUTER_API_KEY missing).', { status: 503 });
  }

  const result = streamText({
    model: or(DEFAULT_MODEL),
    system: BABAH_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 500,
    temperature: 0.3,
  });

  return result.toUIMessageStreamResponse();
}
