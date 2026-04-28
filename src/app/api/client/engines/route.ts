export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/engines');

/**
 * Update tenant trading engines (forex kill-switch & engine toggle).
 * Per backend Sprint 11.4 P2 — PATCH /api/forex/me/engines
 *
 * Body: { enabled_engines: string[] }
 *   free       => [] (read-only)
 *   starter    => ["scalper"]
 *   pro/elite  => ["scalper","swing"]
 *
 * Errors: 403 TIER_FORBIDDEN, 422 ENGINE_UNKNOWN
 */
export async function PATCH(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', error: 'Unauthorized' },
      { status: 401 },
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

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/engines', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Engines PATCH backend HTTP ${res.status}`);
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
    log.warn(`Engines PATCH error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
