/**
 * Email sender — dual transport (SMTP via nodemailer ATAU REST API).
 *
 * Auto-detect: kalau SMTP credentials (smtpUser + smtpPassword) komplet,
 * pakai SMTP relay (smtp-relay.brevo.com:587). Kalau cuma API key, pakai
 * Brevo Transactional REST API. Kalau dua-duanya ada, prefer SMTP karena
 * lebih reliable + support large attachments.
 *
 * Config sumber: SiteSetting (DB, encrypted) → env fallback. Admin edit
 * lewat /admin/cms/email-settings tanpa redeploy.
 */
import nodemailer, { type Transporter } from 'nodemailer';
import { createLogger } from '@/lib/logger';
import { getEmailConfig } from '@/lib/email/config';
import { prisma } from '@/lib/db/prisma';

const log = createLogger('email');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const SMTP_HOST = process.env.SMTP_HOST || 'smtp-relay.brevo.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com';

interface BrevoApiResponse {
  messageId?: string;
  code?: string;
  message?: string;
}

interface SendOptions {
  subject: string;
  html: string;
  text?: string;
  fromAddress?: string;
  fromName?: string;
  skipUnsubHeader?: boolean;
}

let cachedTransporter: Transporter | null = null;
let cachedTransporterKey = '';

function getSmtpTransporter(user: string, pass: string): Transporter {
  // Cache transporter per credential pair — bikin transport baru per send
  // bikin connection setup overhead unnecessary.
  const key = `${user}::${pass.slice(-12)}`;
  if (cachedTransporter && cachedTransporterKey === key) return cachedTransporter;

  const t = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false, // STARTTLS — Brevo port 587
    auth: { user, pass },
    // Connection pool: reuse satu koneksi untuk multiple sends.
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });
  cachedTransporter = t;
  cachedTransporterKey = key;
  return t;
}

async function buildUnsubLink(toEmail: string): Promise<string> {
  const sub = await prisma.subscriber
    .findUnique({ where: { email: toEmail.toLowerCase() }, select: { unsubToken: true } })
    .catch(() => null);
  if (sub?.unsubToken) {
    return `${SITE_URL}/api/public/unsubscribe?token=${sub.unsubToken}`;
  }
  return `${SITE_URL}/api/public/unsubscribe?email=${encodeURIComponent(toEmail)}`;
}

async function sendViaSmtp(
  user: string,
  pass: string,
  to: string,
  opts: SendOptions,
  senderEmail: string,
  senderName: string,
  replyTo: string,
  unsubHeaders: Record<string, string>,
): Promise<{ messageId: string }> {
  const transporter = getSmtpTransporter(user, pass);
  const info = await transporter.sendMail({
    from: { name: senderName, address: senderEmail },
    to,
    replyTo: replyTo || undefined,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
    headers: unsubHeaders,
  });
  log.info(`SMTP sent to ${to}: messageId=${info.messageId}`);
  return { messageId: info.messageId ?? '' };
}

async function sendViaApi(
  apiKey: string,
  to: string,
  opts: SendOptions,
  senderEmail: string,
  senderName: string,
  replyTo: string,
  unsubHeaders: Record<string, string>,
): Promise<{ messageId: string }> {
  const payload: Record<string, unknown> = {
    sender: { name: senderName, email: senderEmail },
    to: [{ email: to }],
    subject: opts.subject,
    htmlContent: opts.html,
  };
  // Brevo reject 400 "missing_parameter headers is blank" kalau headers
  // di-include tapi empty object. Hanya tambah kalau ada entry.
  if (Object.keys(unsubHeaders).length > 0) {
    payload.headers = unsubHeaders;
  }
  if (opts.text) payload.textContent = opts.text;
  if (replyTo) payload.replyTo = { email: replyTo };

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  let data: BrevoApiResponse = {};
  try {
    data = await res.json();
  } catch {
    /* body kosong */
  }
  if (!res.ok) {
    log.error(`Brevo API ${res.status} for ${to}: ${data.code ?? '?'} ${data.message ?? ''}`);
    throw new Error(`Brevo API ${res.status}: ${data.message || data.code || 'unknown'}`);
  }
  log.info(`API sent to ${to}: messageId=${data.messageId}`);
  return { messageId: data.messageId ?? '' };
}

/**
 * Send email. Throws kalau email_disabled, email_unconfigured, atau
 * provider error.
 */
export async function sendEmail(
  to: string,
  subjectOrOpts: string | SendOptions,
  htmlBody?: string,
): Promise<{ messageId: string }> {
  const opts: SendOptions =
    typeof subjectOrOpts === 'string' ? { subject: subjectOrOpts, html: htmlBody ?? '' } : subjectOrOpts;

  const cfg = await getEmailConfig();
  if (!cfg.enabled) {
    throw new Error('email_disabled');
  }

  const senderEmail = opts.fromAddress || cfg.fromAddress;
  const senderName = opts.fromName || cfg.fromName;

  const unsubHeaders: Record<string, string> = {};
  if (!opts.skipUnsubHeader) {
    const unsubUrl = await buildUnsubLink(to);
    unsubHeaders['List-Unsubscribe'] = `<mailto:unsubscribe@babahalgo.com>, <${unsubUrl}>`;
    unsubHeaders['List-Unsubscribe-Post'] = 'List-Unsubscribe=One-Click';
  }

  // Prefer SMTP kalau credentials komplet (user + password)
  const hasSmtp = Boolean(cfg.smtpUser && cfg.smtpPassword);
  const hasApi = Boolean(cfg.apiKey);

  if (!hasSmtp && !hasApi) {
    throw new Error(
      'email_unconfigured: tidak ada Brevo credentials. Set SMTP user+password ATAU API key di /admin/cms/email-settings',
    );
  }

  if (hasSmtp) {
    return sendViaSmtp(
      cfg.smtpUser,
      cfg.smtpPassword,
      to,
      opts,
      senderEmail,
      senderName,
      cfg.replyTo,
      unsubHeaders,
    );
  }

  return sendViaApi(
    cfg.apiKey,
    to,
    opts,
    senderEmail,
    senderName,
    cfg.replyTo,
    unsubHeaders,
  );
}
