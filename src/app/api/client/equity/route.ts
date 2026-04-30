export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend, proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/equity');

async function checkLicense(licenseId: string | null) {
  if (!licenseId) return null;
  return prisma.license.findFirst({
    where: { id: licenseId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { vpsInstance: true },
  });
}

const VALID_PERIODS = new Set(['1d', '7d', '30d', '90d', 'ytd', 'all']);

/**
 * Map BE drawdown point shape -> FE legacy snapshot shape so existing
 * EquityCurve component (data: { time, value }[]) bekerja tanpa perubahan.
 *
 * Backend `/api/forex/analytics/drawdown` (Wave-29T closure) returns:
 *
 *   { period, points: [{ ts, equity_quote, drawdown_quote, drawdown_pct }] }
 *
 * FE expected shape (legacy /api/pamm/master-equity-curve):
 *
 *   { snapshots: [{ timestamp, equity }] }
 */
interface DrawdownPoint {
  ts: string;
  equity_quote: string | number;
  drawdown_quote?: string | number;
  drawdown_pct?: string | number;
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

export async function GET(request: NextRequest) {
  try {
    const licenseId = request.headers.get('x-license-id');
    const vpsInstanceId = request.headers.get('x-vps-instance-id');
    const subscriptionId = request.headers.get('x-subscription-id');

    const license = await checkLicense(licenseId);
    if (!license && !subscriptionId) {
      return NextResponse.json(
        { error: 'License or subscription required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    if (vpsInstanceId) {
      // Model A — VPS_INSTALLATION: legacy on-premise endpoint
      const queryString = searchParams.toString();
      const path = `/api/equity/history${queryString ? `?${queryString}` : ''}`;
      const response = await proxyToVpsBackend(vpsInstanceId, path, { method: 'GET' });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (subscriptionId) {
      // Wave-29T (jawaban-bf 2026-04-30): equity curve sekarang dari
      // /api/forex/analytics/drawdown — returns { points: [{ts, equity_quote,
      // drawdown_quote, drawdown_pct}] }. Map ke legacy shape supaya FE
      // EquityCurve (lightweight-charts area series) tidak perlu refactor.
      const days = searchParams.get('days');
      const periodParam = searchParams.get('period');
      let period = '30d';
      if (periodParam && VALID_PERIODS.has(periodParam)) {
        period = periodParam;
      } else if (days) {
        const map: Record<string, string> = { '1': '1d', '7': '7d', '30': '30d', '90': '90d' };
        period = map[days] ?? '30d';
      }

      const response = await proxyToMasterBackend(
        'tenant',
        `/api/forex/analytics/drawdown?period=${period}`,
        { method: 'GET' },
      );
      if (!response.ok) {
        log.warn(`Equity backend HTTP ${response.status}`);
        return NextResponse.json({ source: 'unavailable', snapshots: [], points: [], period });
      }
      const data = await response.json();
      const points: DrawdownPoint[] = Array.isArray(data?.points) ? data.points : [];
      return NextResponse.json({
        source: 'backend',
        period: data.period ?? period,
        // Legacy shape — kept untuk back-compat existing EquityCurve consumer
        snapshots: points.map((p) => ({
          timestamp: p.ts,
          equity: num(p.equity_quote),
        })),
        // Native Wave-29T shape — pakai untuk drawdown overlay
        points,
      });
    }

    return NextResponse.json(
      { error: 'No VPS instance or subscription found' },
      { status: 400 }
    );
  } catch (error) {
    log.error(`Client equity error: ${error instanceof Error ? error.message : 'unknown'}`);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
