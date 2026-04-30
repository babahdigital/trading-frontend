/**
 * Email config loader — DB SiteSetting overrides env.
 *
 * Admin bisa edit setting via /admin/cms/email-settings tanpa perlu redeploy.
 * Fallback hierarki:
 *   1. DB SiteSetting (key: "email.brevo.api_key" dst.) — encrypted
 *   2. env.BREVO_API_KEY / SMTP_PASSWORD / SMTP_FROM
 *   3. Default value (untuk from name)
 *
 * Settings yang dikelola:
 *   email.brevo.api_key       — Brevo API key (ENCRYPTED)
 *   email.brevo.smtp_user     — Brevo SMTP login (plaintext, biasanya 90xxxxxxxx@smtp-brevo.com)
 *   email.brevo.smtp_password — Brevo SMTP master password (ENCRYPTED)
 *   email.from_address        — sender email, e.g. noreply@babahalgo.com
 *   email.from_name           — sender display name, e.g. "BabahAlgo"
 *   email.reply_to            — optional reply-to address
 *   email.enabled             — kill switch ("true"/"false")
 */
import { prisma } from '@/lib/db/prisma';
import { decryptSecret } from '@/lib/crypto/secret';

export interface EmailConfig {
  apiKey: string;
  smtpUser: string;
  smtpPassword: string;
  fromAddress: string;
  fromName: string;
  replyTo: string;
  enabled: boolean;
  /** Source of truth — "db" if value came from SiteSetting, "env" if env, "missing" if neither */
  source: {
    apiKey: 'db' | 'env' | 'missing';
    fromAddress: 'db' | 'env' | 'default';
  };
}

const DEFAULTS = {
  fromAddress: 'noreply@babahalgo.com',
  fromName: 'BabahAlgo',
};

const SETTING_KEYS = [
  'email.brevo.api_key',
  'email.brevo.smtp_user',
  'email.brevo.smtp_password',
  'email.from_address',
  'email.from_name',
  'email.reply_to',
  'email.enabled',
] as const;

type SettingKey = (typeof SETTING_KEYS)[number];

async function loadDbSettings(): Promise<Map<SettingKey, string>> {
  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...SETTING_KEYS] } },
  });
  const map = new Map<SettingKey, string>();
  for (const r of rows) {
    map.set(r.key as SettingKey, r.value);
  }
  return map;
}

function safeDecrypt(wrapped: string | undefined): string {
  if (!wrapped) return '';
  try {
    return decryptSecret(wrapped);
  } catch {
    return '';
  }
}

export async function getEmailConfig(): Promise<EmailConfig> {
  const db = await loadDbSettings().catch(() => new Map<SettingKey, string>());

  const apiKeyDb = safeDecrypt(db.get('email.brevo.api_key'));
  const apiKey = apiKeyDb || process.env.BREVO_API_KEY || process.env.SMTP_PASSWORD || '';

  const smtpUser = db.get('email.brevo.smtp_user') || process.env.SMTP_USER || '';
  const smtpPassword =
    safeDecrypt(db.get('email.brevo.smtp_password')) || process.env.SMTP_PASSWORD || '';

  const fromAddress =
    db.get('email.from_address') ||
    (process.env.SMTP_FROM ? extractEmail(process.env.SMTP_FROM) : '') ||
    DEFAULTS.fromAddress;

  const fromName =
    db.get('email.from_name') ||
    (process.env.SMTP_FROM ? extractName(process.env.SMTP_FROM) : '') ||
    DEFAULTS.fromName;

  const replyTo = db.get('email.reply_to') || '';

  const enabledRaw = db.get('email.enabled');
  const enabled = enabledRaw === undefined ? true : enabledRaw === 'true';

  return {
    apiKey,
    smtpUser,
    smtpPassword,
    fromAddress,
    fromName,
    replyTo,
    enabled,
    source: {
      apiKey: apiKeyDb ? 'db' : process.env.BREVO_API_KEY || process.env.SMTP_PASSWORD ? 'env' : 'missing',
      fromAddress: db.get('email.from_address') ? 'db' : process.env.SMTP_FROM ? 'env' : 'default',
    },
  };
}

function extractEmail(raw: string): string {
  const m = raw.match(/<(.+?)>/);
  return m?.[1]?.trim() ?? raw.trim();
}

function extractName(raw: string): string {
  const m = raw.match(/^(.+?)\s*</);
  return m?.[1]?.trim() ?? '';
}
