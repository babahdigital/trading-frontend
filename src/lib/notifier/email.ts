import nodemailer, { type Transporter } from 'nodemailer';
import { createLogger } from '@/lib/logger';

const log = createLogger('email');

let _transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (_transporter) return _transporter;

  // Default to Brevo (Sendinblue) SMTP relay
  const host = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!user || !pass) {
    throw new Error('SMTP credentials not configured (SMTP_USER, SMTP_PASSWORD). For Brevo: SMTP_USER=your-brevo-email, SMTP_PASSWORD=xkeysib-...');
  }

  _transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Brevo requires TLS on port 587
    ...(host.includes('brevo.com') && { requireTLS: true }),
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
      'List-Unsubscribe': `<mailto:unsubscribe@babahalgo.com>, <https://babahalgo.com/api/public/unsubscribe?email=${encodeURIComponent(to)}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  log.info(`Email sent to ${to}: messageId=${info.messageId}`);
}
