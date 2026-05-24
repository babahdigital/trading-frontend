export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCronSecret } from '@/lib/auth/cron';

/**
 * Seed default SiteSetting rows so the admin UI shows them as
 * editable + workers can read sensible defaults. Idempotent — only
 * inserts rows that don't exist; never overwrites admin-set values.
 */

const DEFAULTS: Array<{ key: string; value: string; type: string }> = [
  { key: 'brevo_unsubscribe_url', value: 'https://babahalgo.com/unsubscribe', type: 'string' },
  { key: 'contact_email', value: 'hello@babahalgo.com', type: 'string' },
  { key: 'whatsapp_number', value: '#', type: 'string' },
  { key: 'telegram_url', value: 'https://t.me/babahalgo', type: 'string' },
];

export async function GET(request: NextRequest) {
  try {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const created: string[] = [];
  const skipped: string[] = [];

  for (const def of DEFAULTS) {
    const existing = await prisma.siteSetting.findUnique({ where: { key: def.key } });
    if (existing) {
      skipped.push(def.key);
    } else {
      await prisma.siteSetting.create({ data: def });
      created.push(def.key);
    }
  }

  return NextResponse.json({
    status: 'ok',
    created,
    skipped,
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export const POST = GET;
