export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth/require-admin';

const log = createLogger('api/admin/kill-switch/resolve');

/**
 * Admin override resolve for kill-switch event.
 * Per backend Sprint 11.4 P2 — POST /api/forex/admin/kill-switch/{event_id}/resolve
 *
 * Body: { reason: string }  // 1..512 chars
 *
 * Success: { ok, action }
 * Errors:  404 NOT_FOUND, 422 default validation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { event_id: string } },
) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const eventId = params.event_id;
  if (!eventId || eventId.length === 0) {
    return NextResponse.json(
      { code: 'INVALID_INPUT', error: 'event_id is required' },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  // FE-side guard for reason length to fail fast before round-tripping.
  const reason = (body as { reason?: unknown })?.reason;
  if (typeof reason !== 'string' || reason.trim().length === 0 || reason.length > 512) {
    return NextResponse.json(
      { code: 'INVALID_INPUT', error: 'reason must be 1..512 chars' },
      { status: 422 },
    );
  }

  try {
    const res = await proxyToMasterBackend(
      'admin',
      `/api/forex/admin/kill-switch/${encodeURIComponent(eventId)}/resolve`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      },
    );

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Admin resolve backend HTTP ${res.status} (event=${eventId})`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
          details: (payload as { details?: unknown }).details,
        },
        { status: res.status },
      );
    }

    return NextResponse.json({ source: 'backend', ...payload });
  } catch (err) {
    log.warn(`Admin resolve error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
