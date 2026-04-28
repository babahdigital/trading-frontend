export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/kill-switch/status');

/**
 * Read current kill-switch status for the tenant.
 * Per backend Sprint 11.4 P2 — GET /api/forex/me/kill-switch/status
 *
 * Response shape:
 *   {
 *     is_active, event_id, triggers[], triggered_at,
 *     cooling_until, requires_admin, can_self_acknowledge,
 *     seconds_until_self_ack, policy_label
 *   }
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/kill-switch/status', {
      method: 'GET',
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Kill-switch status backend HTTP ${res.status}`);
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
    log.warn(`Kill-switch status error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
