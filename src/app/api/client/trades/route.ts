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

    let response: Response;

    if (vpsInstanceId) {
      response = await proxyToVpsBackend(vpsInstanceId, path, { method: 'GET' });
    } else if (subscriptionId) {
      response = await proxyToMasterBackend(path, { method: 'GET' });
    } else {
      return NextResponse.json(
        { error: 'No VPS instance or subscription found' },
        { status: 400 }
      );
    }

    const data = await response.json();
    const filtered = Array.isArray(data)
      ? data.map(filterTradeHistory)
      : { ...data, trades: (data.trades || []).map(filterTradeHistory) };

    return NextResponse.json(filtered);
  } catch (error) {
    log.error('Client trades error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
