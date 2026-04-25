export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { prisma } from '@/lib/db/prisma';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/signals');

/**
 * Customer Signal Service feed.
 *
 * Authenticated client endpoint — proxies VPS1 master `/api/signals/latest`
 * with the `signals` scoped token. Pagination via cursor-style `since_id`
 * parameter as documented in BABAHALGO_INTEGRATION.md §3 (Signal Service
 * product surface).
 *
 * Tier guard: only Signal Service subscribers (SIGNAL_BASIC, SIGNAL_VIP),
 * PAMM tiers, or higher get live signal access. Free tier gets 403.
 *
 * Falls back to local SignalAuditLog read when master backend unreachable
 * (graceful degradation — customer still sees recent history during outage).
 */
export async function GET(request: NextRequest) {
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  // Forward query params (since_id, limit, min_confidence, pair)
  const sinceId = request.nextUrl.searchParams.get('since_id') ?? '';
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') || '50', 10), 200);
  const minConf = request.nextUrl.searchParams.get('min_confidence') ?? '';
  const pair = request.nextUrl.searchParams.get('pair') ?? '';

  const qs = new URLSearchParams();
  qs.set('limit', String(limit));
  if (sinceId) qs.set('since_id', sinceId);
  if (minConf) qs.set('min_confidence', minConf);
  if (pair) qs.set('pair', pair);

  // Try master backend first
  try {
    const res = await proxyToMasterBackend('signals', `/api/signals/latest?${qs}`, { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      // Normalize: backend returns { signals: [...] } per docs
      const items = Array.isArray(body.signals) ? body.signals : Array.isArray(body.items) ? body.items : [];
      return NextResponse.json({
        source: 'backend',
        items,
        count: items.length,
        tier: gate.effectiveTier,
      });
    }
    log.warn(`Signals backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Signals backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Fallback: serve from local SignalAuditLog (recent history)
  try {
    const where: Record<string, unknown> = {};
    if (pair) where.pair = pair;
    if (minConf) where.confidence = { gte: parseFloat(minConf) };

    const items = await prisma.signalAuditLog.findMany({
      where,
      orderBy: { emittedAt: 'desc' },
      take: limit,
      select: {
        id: true, sourceId: true, pair: true, direction: true, entryType: true,
        lot: true, entryPrice: true, stopLoss: true, takeProfit: true,
        confidence: true, reasoning: true, outcome: true, profitUsd: true,
        emittedAt: true, closedAt: true,
      },
    });
    return NextResponse.json({
      source: 'local-fallback',
      items: items.map((i) => ({ ...i, sourceId: i.sourceId.toString() })),
      count: items.length,
      tier: gate.effectiveTier,
    });
  } catch (err) {
    log.error(`Signals fallback error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
