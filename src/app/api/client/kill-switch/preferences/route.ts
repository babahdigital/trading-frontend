export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/kill-switch/preferences');

/**
 * Read / update kill-switch notification channel preferences.
 * Per backend Sprint 11.4 P2 — /api/forex/me/kill-switch/preferences
 *
 * GET   -> { channels: ["email","telegram"] }
 * PATCH -> body { channels: ("email"|"telegram"|"whatsapp")[] }  min 1, max 3
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
    const res = await proxyToMasterBackend('signals', '/api/forex/me/kill-switch/preferences', {
      method: 'GET',
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`Kill-switch prefs GET backend HTTP ${res.status}`);
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
    log.warn(`Kill-switch prefs GET error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}

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

  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, 'ks-prefs');

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/kill-switch/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`Kill-switch prefs PATCH backend HTTP ${res.status}`);
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
    log.warn(`Kill-switch prefs PATCH error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
