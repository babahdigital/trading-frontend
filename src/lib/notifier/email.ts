import nodemailer, { type Transporter } from 'nodemailer';
import { createLogger } from '@/lib/logger';

const log = createLogger('email');

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error('SMTP credentials not configured (SMTP_HOST, SMTP_USER, SMTP_PASSWORD)');
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return _transporter;
}

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const from = process.env.SMTP_FROM || 'BabahAlgo <no-reply@babahalgo.com>';

  const info = await getTransporter().sendMail({
    from,
    to,
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<mailto:unsubscribe@babahalgo.com>, <https://babahalgo.com/unsubscribe?email=${encodeURIComponent(to)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  log.info(`Email sent to ${to}: messageId=${info.messageId}`);
}
