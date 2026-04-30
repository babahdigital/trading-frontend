export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend, proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { filterPositions } from '@/lib/proxy/filters';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/positions');

async function checkLicense(licenseId: string | null) {
  if (!licenseId) return null;
  return prisma.license.findFirst({
    where: { id: licenseId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { vpsInstance: true },
  });
}

/**
 * Normalize Wave-29S-D PositionView -> legacy FE shape so dashboard tables
 * keep working selama migration. Backend canonical shape:
 *
 *   { id, engine_id, strategy_id, symbol, side, volume_initial,
 *     volume_remaining, entry_price, sl_price, tp_ladder, status,
 *     opened_at, closed_at, close_reason, unrealized_pnl_quote, gross_pnl,
 *     net_pnl_quote }
 *
 * FE legacy shape expected by /portal/positions table:
 *
 *   { ticket, symbol, direction, lot, entry_price, current_price,
 *     pnl_usd, pnl_pips, duration_seconds, sl, tp, setup, confidence,
 *     risk_pct }
 *
 * Field-by-field map below.
 */
type CanonicalPosition = {
  id: string;
  engine_id?: string;
  strategy_id?: string;
  symbol: string;
  side: 'buy' | 'sell';
  volume_initial?: number | string;
  volume_remaining?: number | string;
  entry_price?: number | string;
  sl_price?: number | string | null;
  tp_ladder?: Array<{ level?: number | string; ratio?: number | string }>;
  status: 'open' | 'partial' | 'closed';
  opened_at?: string;
  closed_at?: string | null;
  close_reason?: string | null;
  unrealized_pnl_quote?: number | string;
  gross_pnl?: number | string;
  net_pnl_quote?: number | string;
};

function normalizePosition(p: CanonicalPosition): Record<string, unknown> {
  const isOpen = p.status === 'open' || p.status === 'partial';
  const pnl = isOpen ? p.unrealized_pnl_quote : (p.net_pnl_quote ?? p.gross_pnl);
  const lot = p.volume_remaining ?? p.volume_initial ?? 0;
  const tp1 = Array.isArray(p.tp_ladder) && p.tp_ladder[0]?.level ? p.tp_ladder[0].level : null;
  const openedAt = p.opened_at ? new Date(p.opened_at).getTime() : null;
  const duration = openedAt ? Math.floor((Date.now() - openedAt) / 1000) : 0;
  return {
    ticket: p.id,
    symbol: p.symbol,
    direction: p.side?.toUpperCase() ?? 'BUY',
    lot: Number(lot),
    entry_price: Number(p.entry_price ?? 0),
    current_price: Number(p.entry_price ?? 0), // backend tidak expose di view
    pnl_usd: Number(pnl ?? 0),
    pnl_pips: 0, // backend tidak hitung pip-delta di view; FE hide kalau 0
    duration_seconds: duration,
    sl: p.sl_price != null ? Number(p.sl_price) : null,
    tp: tp1 != null ? Number(tp1) : null,
    setup: p.strategy_id ?? p.engine_id ?? '-',
    confidence: 0,
    risk_pct: 0,
    status: p.status,
    closed_at: p.closed_at,
    close_reason: p.close_reason,
  };
}

export async function GET(request: NextRequest) {
  try {
    const licenseId = request.headers.get('x-license-id');
    const vpsInstanceId = request.headers.get('x-vps-instance-id');
    const subscriptionId = request.headers.get('x-subscription-id');

    const license = await checkLicense(licenseId);
    if (!license && !subscriptionId) {
      return NextResponse.json(
        { error: 'License or subscription not found' },
        { status: 403 }
      );
    }

    if (vpsInstanceId) {
      // Model A — VPS_INSTALLATION: legacy on-premise endpoint + filter
      const response = await proxyToVpsBackend(vpsInstanceId, '/api/positions', {
        method: 'GET',
      });
      const data = await response.json();
      const filtered = Array.isArray(data)
        ? data.map(filterPositions)
        : { ...data, positions: (data.positions || []).map(filterPositions) };
      return NextResponse.json(filtered);
    }

    if (subscriptionId) {
      // Model B — Subscription: canonical /api/forex/positions (Wave-29S-D)
      // Returns { data: PositionView[], pagination }. unrealized_pnl_quote
      // sekarang di-hydrate real-time dari latest tick (sebelumnya hardcoded $0).
      const status = request.nextUrl.searchParams.get('status') ?? 'open';
      const limit = Math.min(
        parseInt(request.nextUrl.searchParams.get('limit') || '50', 10),
        200,
      );
      const cursor = request.nextUrl.searchParams.get('cursor') ?? '';
      const qs = new URLSearchParams({ status, limit: String(limit) });
      if (cursor) qs.set('cursor', cursor);

      try {
        const response = await proxyToMasterBackend(
          'tenant',
          `/api/forex/positions?${qs}`,
          { method: 'GET' },
        );
        if (response.ok) {
          const body = await response.json();
          const rows: CanonicalPosition[] = Array.isArray(body.data)
            ? body.data
            : Array.isArray(body)
              ? body
              : [];
          return NextResponse.json({
            source: 'backend',
            positions: rows.map(normalizePosition),
            pagination: body.pagination ?? null,
          });
        }
        log.warn(`Positions backend HTTP ${response.status}`);
      } catch (err) {
        log.warn(`Positions backend error: ${err instanceof Error ? err.message : 'unknown'}`);
      }

      return NextResponse.json({
        source: 'unavailable',
        positions: [],
        error: 'Backend tidak tersedia, coba lagi nanti.',
      });
    }

    return NextResponse.json(
      { error: 'No VPS instance or subscription found' },
      { status: 400 },
    );
  } catch (error) {
    log.error(`Client positions error: ${error instanceof Error ? error.message : 'unknown'}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
