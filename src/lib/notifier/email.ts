import { createLogger } from '@/lib/logger';

const log = createLogger('email');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface BrevoResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY || process.env.SMTP_PASSWORD;
  if (!apiKey) {
    throw new Error('Brevo API key not configured (BREVO_API_KEY or SMTP_PASSWORD)');
  }

  const fromRaw = process.env.SMTP_FROM || 'BabahAlgo <no-reply@babahalgo.com>';
  const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
  const senderName = fromMatch?.[1]?.trim() || 'BabahAlgo';
  const senderEmail = fromMatch?.[2]?.trim() || 'no-reply@babahalgo.com';

  const unsubUrl = `https://babahalgo.com/api/public/unsubscribe?email=${encodeURIComponent(to)}`;

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      headers: {
        'List-Unsubscribe': `<mailto:unsubscribe@babahalgo.com>, <${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  });

  const data: BrevoResponse = await res.json();

  if (!res.ok) {
    throw new Error(`Brevo API error ${res.status}: ${data.message || JSON.stringify(data)}`);
  }

  log.info(`Email sent to ${to}: messageId=${data.messageId}`);
}
