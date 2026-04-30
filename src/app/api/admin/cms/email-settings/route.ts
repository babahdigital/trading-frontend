/**
 * Admin email settings API.
 *
 * GET: return current config (API key + SMTP password masked, never plaintext).
 * PUT: upsert SiteSetting rows. Sensitive fields (api_key, smtp_password)
 *      di-encrypt sebelum simpan. Empty string di payload artinya "tidak diubah" —
 *      JANGAN overwrite existing dengan empty.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { encryptSecret, decryptSecret, maskSecret } from '@/lib/crypto/secret';
import { z } from 'zod';

const SECRET_KEYS = new Set(['email.brevo.api_key', 'email.brevo.smtp_password']);
const ALL_KEYS = [
  'email.brevo.api_key',
  'email.brevo.smtp_user',
  'email.brevo.smtp_password',
  'email.from_address',
  'email.from_name',
  'email.reply_to',
  'email.enabled',
] as const;

function safeDecrypt(v: string | undefined | null): string {
  if (!v) return '';
  try {
    return decryptSecret(v);
  } catch {
    return '';
  }
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const rows = await prisma.siteSetting.findMany({
    where: { key: { in: [...ALL_KEYS] } },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));

  // Sensitive fields: return masked + boolean flag "set" — UI tahu
  // bahwa setting sudah ada tanpa expose nilai.
  const apiKeyDecrypted = safeDecrypt(map.get('email.brevo.api_key'));
  const smtpPwDecrypted = safeDecrypt(map.get('email.brevo.smtp_password'));

  return NextResponse.json({
    settings: {
      apiKey: apiKeyDecrypted ? maskSecret(apiKeyDecrypted) : '',
      apiKeySet: Boolean(apiKeyDecrypted),
      smtpUser: map.get('email.brevo.smtp_user') ?? '',
      smtpPassword: smtpPwDecrypted ? maskSecret(smtpPwDecrypted) : '',
      smtpPasswordSet: Boolean(smtpPwDecrypted),
      fromAddress: map.get('email.from_address') ?? '',
      fromName: map.get('email.from_name') ?? '',
      replyTo: map.get('email.reply_to') ?? '',
      enabled: (map.get('email.enabled') ?? 'true') === 'true',
    },
  });
}

const putSchema = z.object({
  // Sensitive: kalau undefined / empty → preserve existing.
  apiKey: z.string().max(2000).optional(),
  smtpUser: z.string().max(255).optional(),
  smtpPassword: z.string().max(2000).optional(),
  fromAddress: z.string().email().or(z.literal('')).optional(),
  fromName: z.string().max(80).optional(),
  replyTo: z.string().email().or(z.literal('')).optional(),
  enabled: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = putSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updates: { key: string; value: string }[] = [];
  const d = parsed.data;

  if (d.apiKey !== undefined && d.apiKey !== '') {
    updates.push({ key: 'email.brevo.api_key', value: encryptSecret(d.apiKey) });
  }
  if (d.smtpUser !== undefined) {
    updates.push({ key: 'email.brevo.smtp_user', value: d.smtpUser });
  }
  if (d.smtpPassword !== undefined && d.smtpPassword !== '') {
    updates.push({ key: 'email.brevo.smtp_password', value: encryptSecret(d.smtpPassword) });
  }
  if (d.fromAddress !== undefined) {
    updates.push({ key: 'email.from_address', value: d.fromAddress });
  }
  if (d.fromName !== undefined) {
    updates.push({ key: 'email.from_name', value: d.fromName });
  }
  if (d.replyTo !== undefined) {
    updates.push({ key: 'email.reply_to', value: d.replyTo });
  }
  if (d.enabled !== undefined) {
    updates.push({ key: 'email.enabled', value: d.enabled ? 'true' : 'false' });
  }

  // Upsert satu per satu — Prisma tidak support batch upsert without unique
  for (const u of updates) {
    await prisma.siteSetting.upsert({
      where: { key: u.key },
      update: { value: u.value, type: SECRET_KEYS.has(u.key) ? 'encrypted' : 'string' },
      create: { key: u.key, value: u.value, type: SECRET_KEYS.has(u.key) ? 'encrypted' : 'string' },
    });
  }

  return NextResponse.json({ success: true, updated: updates.length });
}
