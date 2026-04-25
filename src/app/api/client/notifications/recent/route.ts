export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/notifications/recent');

interface BackendNotification {
  id: string;
  occurred_at: string;
  channel: string;
  severity: 'info' | 'warning' | 'critical';
  locale: string;
  event_type: string;
  title: string;
  body: string;
  tags: {
    symbol?: string;
    side?: string;
    tenant_id: string;
    position_id?: string;
    result?: 'profit' | 'loss';
  };
}

/**
 * Recent notifications feed per docs/backend-contract §6.13.
 *
 * Backend already pre-renders body with emojis + newlines → frontend
 * MUST render with `white-space: pre-line`. Severity drives badge color
 * (info=blue, warning=yellow, critical=red). `tags.position_id` enables
 * deep-link to /portal/positions/{id}.
 *
 * Falls back to local NotificationLog when backend unreachable, mapping
 * shape onto the §6.13 schema as best-effort.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
  const cursor = request.nextUrl.searchParams.get('cursor') ?? '';

  // Try master backend first
  try {
    const qs = new URLSearchParams({ limit: String(limit) });
    if (cursor) qs.set('cursor', cursor);
    const res = await proxyToMasterBackend('signals', `/api/forex/me/notifications/recent?${qs}`, { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      const items: BackendNotification[] = Array.isArray(body.items) ? body.items : [];
      return NextResponse.json({
        source: 'backend',
        items,
        count: items.length,
        next_cursor: body.next_cursor ?? null,
      });
    }
    log.warn(`Notifications backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Notifications backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Local fallback — map NotificationLog → §6.13 shape (best-effort)
  try {
    const logs = await prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: { id: true, channel: true, category: true, status: true, createdAt: true, payload: true },
    });
    const items: BackendNotification[] = logs.map((l) => {
      const payload = (l.payload as Record<string, unknown>) ?? {};
      const severity = (payload.severity as 'info' | 'warning' | 'critical') ?? 'info';
      return {
        id: l.id,
        occurred_at: l.createdAt.toISOString(),
        channel: String(l.channel).toLowerCase(),
        severity,
        locale: (payload.locale as string) ?? 'id',
        event_type: l.category,
        title: (payload.title as string) ?? l.category,
        body: (payload.body as string) ?? '',
        tags: {
          tenant_id: userId,
          symbol: payload.symbol as string | undefined,
          side: payload.side as string | undefined,
          position_id: payload.position_id as string | undefined,
          result: payload.result as 'profit' | 'loss' | undefined,
        },
      };
    });
    return NextResponse.json({ source: 'local-fallback', items, count: items.length, next_cursor: null });
  } catch (err) {
    log.error(`Notifications fallback error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }
}
