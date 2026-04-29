export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/telegram/config');

/**
 * Bridge for forex tenant Telegram config (Wave-29B).
 *
 * Backend exposes:
 *   GET   /api/forex/tenant/telegram
 *   PATCH /api/forex/tenant/telegram
 *
 * Both pass-through — frontend doesn't transform shape, lets backend
 * own the schema contract. The /api/client/profile route still writes
 * the local mirror (User.telegramChatId) for in-app references but the
 * backend is the dispatch source of truth.
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
    const res = await proxyToMasterBackend('signals', '/api/forex/tenant/telegram', {
      method: 'GET',
      headers: { 'X-Babahalgo-User-Id': userId },
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`Telegram config GET HTTP ${res.status}`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
        },
        { status: res.status },
      );
    }
    return NextResponse.json(payload);
  } catch (err) {
    log.warn(`Telegram config GET error: ${err instanceof Error ? err.message : 'unknown'}`);
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

  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, 'tg-config');

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/tenant/telegram', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
        'X-Babahalgo-User-Id': userId,
      },
      body: JSON.stringify(body),
    });
    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`Telegram config PATCH HTTP ${res.status}`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
        },
        { status: res.status },
      );
    }
    return NextResponse.json(payload);
  } catch (err) {
    log.warn(`Telegram config PATCH error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
