export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/kill-switch/acknowledge');

/**
 * Self-acknowledge active kill-switch event.
 * Per backend Sprint 11.4 P2 — POST /api/forex/me/kill-switch/acknowledge
 *
 * Body: { current_equity?: string }  // required when policy = EQUITY_DRAWDOWN
 *
 * Success: { outcome, resolved_event_id, cooling_until, recovered_pct, required_pct }
 *
 * Errors:
 *   404 KILL_SWITCH_NOT_ACTIVE
 *   409 KILL_SWITCH_COOLING_OFF (details.cooling_until)
 *   409 KILL_SWITCH_REQUIRES_ADMIN
 *   409 KILL_SWITCH_EQUITY_NOT_RECOVERED (details.recovered_pct + required_pct)
 *   429 KILL_SWITCH_RATE_LIMITED
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  // Body is optional — backend treats missing body as "no equity supplied"
  let body: unknown = {};
  try {
    const text = await request.text();
    if (text.trim().length > 0) {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { code: 'INVALID_JSON', error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/kill-switch/acknowledge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Kill-switch ack backend HTTP ${res.status}`);
      // Preserve backend error code + details intact for FE handling.
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
    log.warn(`Kill-switch ack error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
