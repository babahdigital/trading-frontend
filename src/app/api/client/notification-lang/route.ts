export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/notification-lang');

const PatchBody = z.object({
  notification_lang: z.enum(['en', 'id', 'zh', 'ja', 'ar', 'vi']),
}).strict();

/**
 * Update tenant notification language. Per backend-contract §6.12.
 *
 * Free tier may receive 403 — backend enforces tier gate (free inherits 'en'
 * with no override). Forward backend response unchanged so UI can render
 * upgrade-tier CTA.
 */
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/notification-lang', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(text); } catch { /* leave empty */ }

    if (!res.ok) {
      log.warn(`notification-lang HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...payload }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ...payload });
  } catch (err) {
    log.warn(`notification-lang error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
