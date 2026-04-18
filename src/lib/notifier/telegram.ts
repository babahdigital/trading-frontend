import { createLogger } from '@/lib/logger';

const log = createLogger('telegram');

export async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not configured');

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
      disable_web_page_preview: true,
      disable_notification: false,
    }),
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    log.error(`Telegram API error for ${chatId}: ${errorBody}`);
    throw new Error(`Telegram API ${response.status}: ${errorBody.slice(0, 200)}`);
  }
}

/** Handle /start webhook for Telegram onboarding */
export async function handleTelegramWebhook(update: Record<string, unknown>) {
  const message = update.message as Record<string, unknown> | undefined;
  if (!message) return;

  const chat = message.chat as Record<string, unknown> | undefined;
  const chatId = String(chat?.id ?? '');
  const text = String(message.text ?? '');

  if (text.startsWith('/start') && chatId) {
    const startMsg = [
      '*Selamat Datang di BabahAlgo Signal!*',
      '',
      'Bot ini akan kirim sinyal trading BUY/SELL forex & crypto otomatis ke chat ini.',
      '',
      `*Chat ID Anda*: \`${chatId}\``,
      '',
      'Salin Chat ID di atas, lalu:',
      '1. Login ke https://babahalgo.com',
      '2. Pergi ke Portal > Settings > Notifications',
      '3. Paste Chat ID di kolom "Telegram Chat ID"',
      '4. Simpan',
      '',
      'Setelah langganan aktif, sinyal otomatis masuk ke chat ini.',
      '',
      '_Disclaimer: Sinyal ini bukan saran investasi. Trading berisiko tinggi._',
    ].join('\n');

    await sendTelegram(chatId, startMsg);
  }
}
