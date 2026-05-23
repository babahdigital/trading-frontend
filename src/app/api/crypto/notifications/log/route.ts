/**
 * FE proxy untuk backend crypto notification log endpoint (live since rc25).
 *
 * Backend trading-crypto v0.8.0-rc25:
 *   GET /api/tenants/{id}/notifications/log?since_id=N&limit=100
 *
 * Architecture: backend = single source of truth (notification_event_log
 * table di Postgres). FE poll dengan since_id cursor untuk receive events
 * baru, lalu decide channel per event_type + user preference:
 *   - Telegram: backend TelegramSink (sync, sudah jalan)
 *   - WhatsApp + Email: FE dispatch via existing adapter (Fonnte / Brevo)
 *
 * Auth: scope='keys' (per backend doc rc24+ endpoint /api/tenants/{id}/*
 * butuh RequireKeys atau RequireAdmin). X-Tenant-Id wajib.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });

  if (!cryptoBackendConfigured()) {
    // Crypto backend env vars not configured — return empty payload so FE polling doesn't crash.
    return NextResponse.json({
      items: [],
      next_since_id: 0,
      has_more: false,
      source: 'unconfigured',
    });
  }

  // Resolve cryptoTenantId — backend rc37 path-scoped tenant validation.
  // Tanpa subscription crypto, tidak ada notif crypto-side untuk poll.
  const sub = await prisma.cryptoBotSubscription.findUnique({
    where: { userId },
    select: { cryptoTenantId: true },
  });
  if (!sub?.cryptoTenantId) {
    return NextResponse.json({
      items: [],
      next_since_id: 0,
      has_more: false,
      source: 'no_subscription',
    });
  }
  const tenantId = sub.cryptoTenantId;

  // Forward query params apa adanya (since_id, limit, event_type filter, severity).
  const params = new URLSearchParams();
  const sinceId = request.nextUrl.searchParams.get('since_id');
  const limit = request.nextUrl.searchParams.get('limit') ?? '100';
  if (sinceId) params.set('since_id', sinceId);
  params.set('limit', String(Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500)));
  const eventType = request.nextUrl.searchParams.get('event_type');
  if (eventType) params.set('event_type', eventType);
  const severity = request.nextUrl.searchParams.get('severity');
  if (severity) params.set('severity', severity);

  const res = await proxyToCryptoBackend({
    scope: 'keys',
    path: `/api/tenants/${encodeURIComponent(tenantId)}/notifications/log?${params}`,
    method: 'GET',
    forwardUserId: userId,
    tenantId: userId,
    timeoutMs: 8_000,
  });

  if (!res.ok) {
    // 404 sebelum backend rc25 deploy — return empty graceful.
    if (res.status === 404) {
      return NextResponse.json({
        items: [],
        next_since_id: sinceId ? Number(sinceId) : 0,
        has_more: false,
        source: 'not_ready',
      });
    }
    return NextResponse.json(
      { error: 'backend_error', status: res.status },
      { status: res.status },
    );
  }

  const data = await res.json();
  return NextResponse.json({
    items: data.items ?? [],
    next_since_id: data.next_since_id ?? 0,
    has_more: Boolean(data.has_more),
    source: 'backend',
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
