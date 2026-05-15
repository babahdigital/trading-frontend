export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';

const log = createLogger('api/client/close-account');

/**
 * Tenant self-service account closure.
 * Backend: POST /api/forex/me/close-account (Phase 14V — soft delete)
 *
 * Effect:
 *   - api_token revoked immediately (this call won't work twice)
 *   - tenant.status = 'deleted'
 *   - enabled_engines = []
 *   - Position history retained for audit + AI learning (no hard delete)
 *
 * Body: { reason: string, confirm: true }
 * Response: 200 { tenant_id, closed_at }
 *
 * After successful close, FE harus clear all cookies + redirect ke /goodbye.
 */

const CloseSchema = z.object({
  reason: z.string().min(3).max(512),
  confirm: z.literal(true),
});

export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = CloseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { code: 'VALIDATION_FAILED', error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, `close:${userId}`);

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/close-account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(parsed.data),
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`close-account backend HTTP ${res.status} user=${userId}`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
        },
        { status: res.status },
      );
    }

    // Clear FE cookies setelah backend ack — token sudah revoked di backend,
    // tidak boleh ada session yang persist.
    const response = NextResponse.json({ source: 'backend', ...payload });
    response.cookies.delete('babahalgo_api_token');
    response.cookies.delete('access_token');
    response.cookies.delete('refresh_token');
    return response;
  } catch (err) {
    log.warn(`close-account error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
