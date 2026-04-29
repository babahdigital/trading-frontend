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

interface OutboundItem {
  id: string;
  event_type: string;
  severity: string;
  channel: string;
  title: string;
  body: string;
  locale?: string;
  tags?: Record<string, unknown>;
  created_at: string;
  read_at?: string | null;
}

/**
 * Recent notifications feed per docs/backend-contract §6.13.
 *
 * Backend already pre-renders body with emojis + newlines → frontend
 * MUST render with `white-space: pre-line`. Severity drives badge color
 * (info=blue, warning=yellow, critical=red). `tags.position_id` enables
 * deep-link to /portal/positions/{id}.
 *
 * Merges TWO upstream sources to cover both dispatch modes (Wave-29C):
 *   - /api/forex/me/notifications/recent  → tenants on 'backend' mode
 *   - /api/forex/me/notifications/outbound → tenants on 'frontend_only'
 * Without merging the latter, new tenants (default since 2026-04-29)
 * would see an empty feed.
 *
 * Falls back to local NotificationLog when both sources fail.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = Math.min(Math.max(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 1), 200);
  const cursor = request.nextUrl.searchParams.get('cursor') ?? '';

  // Fetch both sources in parallel — either may be empty depending on
  // the tenant's notification_dispatch_mode. Failures are tolerated.
  const qsRecent = new URLSearchParams({ limit: String(limit) });
  if (cursor) qsRecent.set('cursor', cursor);
  const qsOutbound = new URLSearchParams({ limit: String(limit) });

  const [recentRes, outboundRes] = await Promise.allSettled([
    proxyToMasterBackend('signals', `/api/forex/me/notifications/recent?${qsRecent}`, { method: 'GET' }),
    proxyToMasterBackend('signals', `/api/forex/me/notifications/outbound?${qsOutbound}`, { method: 'GET' }),
  ]);

  const merged: BackendNotification[] = [];
  let recentOk = false;
  let outboundOk = false;
  let nextCursor: string | null = null;

  if (recentRes.status === 'fulfilled' && recentRes.value.ok) {
    try {
      const body = await recentRes.value.json();
      const items: BackendNotification[] = Array.isArray(body.items) ? body.items : [];
      merged.push(...items);
      nextCursor = body.next_cursor ?? null;
      recentOk = true;
    } catch (err) {
      log.warn(`Recent parse error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  if (outboundRes.status === 'fulfilled' && outboundRes.value.ok) {
    try {
      const body = await outboundRes.value.json();
      const data: OutboundItem[] = Array.isArray(body.data) ? body.data : [];
      // Normalize outbound shape → §6.13 BackendNotification.
      for (const o of data) {
        merged.push({
          id: o.id,
          occurred_at: o.created_at,
          channel: o.channel,
          severity: (o.severity || 'info').toLowerCase() as 'info' | 'warning' | 'critical',
          locale: o.locale ?? 'id',
          event_type: o.event_type,
          title: o.title,
          body: o.body,
          tags: {
            tenant_id: userId,
            symbol: (o.tags?.symbol as string | undefined),
            side: (o.tags?.side as string | undefined),
            position_id: (o.tags?.position_id as string | undefined),
            result: (o.tags?.result as 'profit' | 'loss' | undefined),
          },
        });
      }
      outboundOk = true;
    } catch (err) {
      log.warn(`Outbound parse error: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  if (recentOk || outboundOk) {
    // Sort by occurred_at desc, dedupe by id (in case any tenant straddles modes).
    const seen = new Set<string>();
    const deduped = merged
      .filter((n) => (seen.has(n.id) ? false : (seen.add(n.id), true)))
      .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
      .slice(0, limit);
    return NextResponse.json({
      source: outboundOk && recentOk ? 'backend' : (outboundOk ? 'backend-outbound' : 'backend-recent'),
      items: deduped,
      count: deduped.length,
      next_cursor: nextCursor,
    });
  }

  if (recentRes.status === 'fulfilled') {
    log.warn(`Notifications recent backend HTTP ${recentRes.value.status}`);
  }
  if (outboundRes.status === 'fulfilled') {
    log.warn(`Notifications outbound backend HTTP ${outboundRes.value.status}`);
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
