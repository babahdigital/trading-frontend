export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend, proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/positions/stats');

interface RawPosition {
  symbol?: string;
  pair?: string;
  direction?: string;
  side?: string;
  pnl_usd?: number | string;
  profit_usd?: number | string;
  status?: string;
}

interface PositionStats {
  open_count: number;
  long_count: number;
  short_count: number;
  total_unrealized_usd: number;
  best_position_usd: number;
  worst_position_usd: number;
  by_pair: { pair: string; count: number; pnl_usd: number }[];
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function r2(n: number): number {
  return Math.round(n * 100) / 100;
}

function aggregate(rows: RawPosition[]): PositionStats {
  const byPair = new Map<string, { count: number; pnl_usd: number }>();
  let long_count = 0;
  let short_count = 0;
  let total = 0;
  let best = 0;
  let worst = 0;

  for (const p of rows) {
    const pair = (p.symbol ?? p.pair ?? 'UNKNOWN').toUpperCase();
    const pnl = num(p.pnl_usd ?? p.profit_usd);
    const dir = String(p.direction ?? p.side ?? '').toLowerCase();

    if (dir === 'buy' || dir === 'long') long_count++;
    else if (dir === 'sell' || dir === 'short') short_count++;

    total += pnl;
    if (pnl > best) best = pnl;
    if (pnl < worst) worst = pnl;

    const slot = byPair.get(pair) ?? { count: 0, pnl_usd: 0 };
    slot.count += 1;
    slot.pnl_usd += pnl;
    byPair.set(pair, slot);
  }

  return {
    open_count: rows.length,
    long_count,
    short_count,
    total_unrealized_usd: r2(total),
    best_position_usd: r2(best),
    worst_position_usd: r2(worst),
    by_pair: Array.from(byPair.entries())
      .map(([pair, v]) => ({ pair, count: v.count, pnl_usd: r2(v.pnl_usd) }))
      .sort((a, b) => b.count - a.count),
  };
}

async function checkLicense(licenseId: string | null) {
  if (!licenseId) return null;
  return prisma.license.findFirst({
    where: { id: licenseId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
  });
}

export async function GET(request: NextRequest) {
  const licenseId = request.headers.get('x-license-id');
  const vpsInstanceId = request.headers.get('x-vps-instance-id');
  const subscriptionId = request.headers.get('x-subscription-id');

  const license = await checkLicense(licenseId);
  if (!license && !subscriptionId) {
    return NextResponse.json({ error: 'License or subscription required' }, { status: 403 });
  }

  try {
    let positions: RawPosition[] = [];

    if (vpsInstanceId) {
      const res = await proxyToVpsBackend(vpsInstanceId, '/api/positions', { method: 'GET' });
      const data = await res.json();
      positions = Array.isArray(data) ? data : Array.isArray(data?.positions) ? data.positions : [];
    } else if (subscriptionId) {
      const res = await proxyToMasterBackend('pamm', '/api/pamm/master-status', { method: 'GET' });
      const data = await res.json();
      positions = Array.isArray(data?.open_positions) ? data.open_positions : [];
    }

    const stats = aggregate(positions);
    return NextResponse.json({ source: 'backend', ...stats });
  } catch (err) {
    log.warn(`Position stats error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({
      source: 'unavailable',
      open_count: 0,
      long_count: 0,
      short_count: 0,
      total_unrealized_usd: 0,
      best_position_usd: 0,
      worst_position_usd: 0,
      by_pair: [],
      error: 'Backend unavailable — try again shortly.',
    }, { status: 200 });
  }
}
