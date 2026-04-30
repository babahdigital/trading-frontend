export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend, proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { filterTradeHistory } from '@/lib/proxy/filters';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/trades');

async function checkLicense(licenseId: string | null) {
  if (!licenseId) return null;
  return prisma.license.findFirst({
    where: { id: licenseId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
    include: { vpsInstance: true },
  });
}

export async function GET(request: NextRequest) {
  try {
    const licenseId = request.headers.get('x-license-id');
    const vpsInstanceId = request.headers.get('x-vps-instance-id');
    const subscriptionId = request.headers.get('x-subscription-id');

    const license = await checkLicense(licenseId);
    if (!license) {
      return NextResponse.json(
        { error: 'License not found or expired' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const path = `/api/trades/history${queryString ? `?${queryString}` : ''}`;

    if (vpsInstanceId) {
      // Model A — VPS_INSTALLATION: legacy endpoint + filter
      const response = await proxyToVpsBackend(vpsInstanceId, path, { method: 'GET' });
      const data = await response.json();
      const filtered = Array.isArray(data)
        ? data.map(filterTradeHistory)
        : { ...data, trades: (data.trades || []).map(filterTradeHistory) };
      return NextResponse.json(filtered);
    } else if (subscriptionId) {
      // Wave-29S-D: trade history sekarang via canonical
      // /api/forex/positions?status=closed (cursor-paginated). Backend
      // PositionView mencakup gross_pnl + net_pnl_quote untuk closed trades.
      const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 200);
      const cursor = searchParams.get('cursor') ?? '';
      const qs = new URLSearchParams({ status: 'closed', limit: String(limit) });
      if (cursor) qs.set('cursor', cursor);
      const response = await proxyToMasterBackend('tenant', `/api/forex/positions?${qs}`, {
        method: 'GET',
      });
      if (!response.ok) {
        log.warn(`Trades backend HTTP ${response.status}`);
        return NextResponse.json({ source: 'unavailable', trades: [], pagination: null });
      }
      const data = await response.json();
      const trades = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
      return NextResponse.json({
        source: 'backend',
        trades,
        pagination: data.pagination ?? null,
      });
    } else {
      return NextResponse.json(
        { error: 'No VPS instance or subscription found' },
        { status: 400 }
      );
    }
  } catch (error) {
    log.error('Client trades error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
