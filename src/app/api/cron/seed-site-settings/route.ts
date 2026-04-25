export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

/**
 * Seed default SiteSetting rows so the admin UI shows them as
 * editable + workers can read sensible defaults. Idempotent — only
 * inserts rows that don't exist; never overwrites admin-set values.
 */

const DEFAULTS: Array<{ key: string; value: string; type: string }> = [
  { key: 'exness_affiliate_url', value: '#', type: 'string' },
  { key: 'vps1_affiliate_url', value: '#', type: 'string' },
  { key: 'brevo_unsubscribe_url', value: 'https://babahalgo.com/unsubscribe', type: 'string' },
];

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && header === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
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
}

export const POST = GET;
