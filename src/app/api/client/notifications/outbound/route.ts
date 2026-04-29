export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/notifications/outbound');

/**
 * Read outbound notifications persisted by the forex backend (Wave-29C).
 *
 * Per backend `tenant_config.notification_dispatch_mode`: tenants on
 * 'frontend_only' (the default for new tenants since 2026-04-29) DO NOT
 * receive Telegram/Email/WhatsApp pushes from backend — instead the
 * backend persists the message to `notifications.outbound_log` and FE
 * must poll this endpoint to render the feed.
 *
 * Backend: GET /api/forex/me/notifications/outbound?since=&unread_only=&limit=
 *
 * Response shape:
 *   {
 *     data: [{
 *       id, event_type, severity, channel, title, body,
 *       locale, tags, created_at, read_at
 *     }],
 *     count
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

  const url = new URL(request.url);
  const qs = new URLSearchParams();
  const since = url.searchParams.get('since');
  const unreadOnly = url.searchParams.get('unread_only');
  const limit = url.searchParams.get('limit') || '50';
  if (since) qs.set('since', since);
  if (unreadOnly === 'true' || unreadOnly === '1') qs.set('unread_only', 'true');
  qs.set('limit', limit);

  try {
    const res = await proxyToMasterBackend(
      'signals',
      `/api/forex/me/notifications/outbound?${qs.toString()}`,
      { method: 'GET' },
    );

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Outbound notifications backend HTTP ${res.status}`);
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
    log.warn(`Outbound fetch error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
