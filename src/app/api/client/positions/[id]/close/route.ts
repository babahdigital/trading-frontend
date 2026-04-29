export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend } from '@/lib/proxy/vps-client';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const log = createLogger('api/client/positions/close');

const CloseBody = z.object({
  reason: z.string().min(1).max(200).optional(),
}).strict();

/**
 * Customer-initiated manual position close.
 *
 * Only available for Model A (VPS_INSTALLATION) — the customer owns the VPS,
 * so the legacy `/api/positions/{id}/close` proxy applies. PAMM/SIGNAL
 * subscribers do NOT control execution and receive 405 here.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const licenseId = request.headers.get('x-license-id');
  const vpsInstanceId = request.headers.get('x-vps-instance-id');

  if (!licenseId || !vpsInstanceId) {
    return NextResponse.json({
      error: 'Manual close requires VPS_INSTALLATION license',
      message: 'PAMM/Signal subscribers cannot manually close positions — execution is bot-controlled.',
    }, { status: 403 });
  }

  const license = await prisma.license.findFirst({
    where: { id: licenseId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
  });
  if (!license) {
    return NextResponse.json({ error: 'License not found or expired' }, { status: 403 });
  }

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Position ID required' }, { status: 400 });

  let body: z.infer<typeof CloseBody> = {};
  if (request.headers.get('content-type')?.includes('application/json')) {
    try {
      const raw = await request.json();
      body = CloseBody.parse(raw);
    } catch (err) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: err instanceof Error ? err.message : 'parse error',
      }, { status: 400 });
    }
  }

  // Position close is the most safety-critical idempotent op — double-click
  // must NOT close the same position twice. Forward client key or generate
  // one stable per request.
  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, `pos-close-${id.slice(0, 12)}`);

  try {
    const res = await proxyToVpsBackend(vpsInstanceId, `/api/positions/${encodeURIComponent(id)}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ reason: body.reason ?? 'user_manual_close' }),
    });

    const text = await res.text();
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }

    if (!res.ok) {
      log.warn(`Close position ${id} failed: HTTP ${res.status}`);
      return NextResponse.json({ error: 'Close failed', status: res.status, ...(typeof payload === 'object' ? payload : {}) }, { status: res.status });
    }

    return NextResponse.json({ ok: true, position_id: id, ...(typeof payload === 'object' ? payload : {}) });
  } catch (err) {
    log.error(`Close position ${id} error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'Backend unreachable' }, { status: 503 });
  }
}
