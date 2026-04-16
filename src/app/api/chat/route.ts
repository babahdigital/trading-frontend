import { streamText, convertToModelMessages } from 'ai';
import { google } from '@ai-sdk/google';
import { BABAH_SYSTEM_PROMPT } from '@/lib/chat/system-prompt';

export async function POST(request: Request) {
  const { messages } = await request.json();

  const result = streamText({
    model: google('gemini-2.5-flash'),
    system: BABAH_SYSTEM_PROMPT,
    messages: await convertToModelMessages(messages),
    maxOutputTokens: 500,
    temperature: 0.3,
  });

  return result.toUIMessageStreamResponse();
}
