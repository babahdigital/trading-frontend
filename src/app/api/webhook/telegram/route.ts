import { NextRequest, NextResponse } from 'next/server';
import { handleTelegramWebhook } from '@/lib/notifier/telegram';
import { createLogger } from '@/lib/logger';

const log = createLogger('telegram-webhook');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Telegram Bot Webhook endpoint.
 * Register with: POST https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://babahalgo.com/api/webhook/telegram?secret=<CRON_SECRET>
 */
export async function POST(request: NextRequest) {
  // Verify webhook secret (query param to avoid Telegram header conflicts)
  const secret = request.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  try {
    const update = await request.json();
    await handleTelegramWebhook(update);
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('Telegram webhook error:', err);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}
