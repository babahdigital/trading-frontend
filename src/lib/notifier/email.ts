/**
 * Email sender via Brevo Transactional API.
 *
 * Config sumber: SiteSetting (DB, encrypted) override env. Admin bisa edit
 * via /admin/cms/email-settings tanpa redeploy. Fallback ke env vars
 * (BREVO_API_KEY, SMTP_FROM) untuk bootstrap.
 *
 * Brevo API: https://api.brevo.com/v3/smtp/email
 *   POST { sender, to, subject, htmlContent, headers, replyTo? }
 *   200 → { messageId }
 *   4xx → { code, message }
 *
 * RFC 8058: Sertakan List-Unsubscribe header agar Gmail/Outlook show
 * "Unsubscribe" link di UI native. Pakai Subscriber.unsubToken kalau
 * tersedia (preferred — secure, no email leak), email fallback otherwise.
 */
import { createLogger } from '@/lib/logger';
import { getEmailConfig } from '@/lib/email/config';
import { prisma } from '@/lib/db/prisma';

const log = createLogger('email');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';

interface BrevoResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

interface SendOptions {
  /** Subject line */
  subject: string;
  /** HTML body */
  html: string;
  /** Optional plain-text fallback (recommended untuk SPF/DKIM scoring) */
  text?: string;
  /** Optional override sender email (rare — biasanya pakai config) */
  fromAddress?: string;
  /** Optional override sender name */
  fromName?: string;
  /** Skip List-Unsubscribe header (e.g. transactional non-marketing) */
  skipUnsubHeader?: boolean;
}

async function buildUnsubLink(toEmail: string): Promise<string> {
  // Cari Subscriber by email — kalau ada, pakai unsubToken (preferred)
  const sub = await prisma.subscriber
    .findUnique({ where: { email: toEmail.toLowerCase() }, select: { unsubToken: true } })
    .catch(() => null);
  if (sub?.unsubToken) {
    return `${SITE_URL}/api/public/unsubscribe?token=${sub.unsubToken}`;
  }
  // Fallback email-based
  return `${SITE_URL}/api/public/unsubscribe?email=${encodeURIComponent(toEmail)}`;
}

/**
 * Send single email via Brevo. Throws on misconfiguration atau API error.
 */
export async function sendEmail(to: string, subjectOrOpts: string | SendOptions, htmlBody?: string): Promise<{ messageId: string }> {
  // Backward-compat: legacy signature sendEmail(to, subject, html)
  const opts: SendOptions =
    typeof subjectOrOpts === 'string' ? { subject: subjectOrOpts, html: htmlBody ?? '' } : subjectOrOpts;

  const cfg = await getEmailConfig();
  if (!cfg.enabled) {
    throw new Error('email_disabled');
  }
  if (!cfg.apiKey) {
    throw new Error('email_unconfigured: Brevo API key missing (set in /admin/cms/email-settings or BREVO_API_KEY env)');
  }

  const senderEmail = opts.fromAddress || cfg.fromAddress;
  const senderName = opts.fromName || cfg.fromName;

  const headers: Record<string, string> = {};
  if (!opts.skipUnsubHeader) {
    const unsubUrl = await buildUnsubLink(to);
    headers['List-Unsubscribe'] = `<mailto:unsubscribe@babahalgo.com>, <${unsubUrl}>`;
    headers['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject: opts.subject,
    htmlContent: opts.html,
    headers,
  };
  if (opts.text) payload.textContent = opts.text;
  if (cfg.replyTo) payload.replyTo = { email: cfg.replyTo };

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': cfg.apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data: BrevoResponse = {};
  try {
    data = await res.json();
  } catch {
    // Body kosong / non-JSON
  }

  if (!res.ok) {
    log.error(`Brevo ${res.status} for ${to}: ${data.code ?? '?'} ${data.message ?? '(no message)'}`);
    throw new Error(`Brevo API error ${res.status}: ${data.message || data.code || 'unknown'}`);
  }

  log.info(`Email sent to ${to}: messageId=${data.messageId}`);
  return { messageId: data.messageId ?? '' };
}
