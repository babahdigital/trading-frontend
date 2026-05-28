export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend, proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';
import { isAdminRole } from '@/lib/auth/roles';

const log = createLogger('api/client/performance');

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
    // Admins (no license/subscription) view the master-tenant snapshot. (P1-DI-11)
    const isAdmin = isAdminRole(request.headers.get('x-user-role') ?? '');

    const license = await checkLicense(licenseId);
    if (!license && !subscriptionId && !isAdmin) {
      return NextResponse.json(
        { error: 'License not found or expired' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    const path = `/api/performance/summary${queryString ? `?${queryString}` : ''}`;

    let response: Response;

    if (vpsInstanceId) {
      // Model A — VPS_INSTALLATION: legacy endpoint
      response = await proxyToVpsBackend(vpsInstanceId, path, { method: 'GET' });
    } else if (subscriptionId || isAdmin) {
      // Wave-29S-D: migrate dari /api/stats/performance (legacy aggregate)
      // ke canonical /api/forex/positions/stats?period=... yang sekarang
      // include net_pnl_quote real-time + max_drawdown_quote.
      const periodMap: Record<string, string> = {
        '1': '1d', '7': '7d', '30': '30d', '90': '90d',
      };
      const rawDays = searchParams.get('period_days') || '30';
      const period = periodMap[rawDays] || '30d';
      response = await proxyToMasterBackend('tenant', `/api/forex/positions/stats?period=${period}`, {
        method: 'GET',
      });
    } else {
      return NextResponse.json(
        { error: 'No VPS instance or subscription found' },
        { status: 400 }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    log.error('Client performance error:', error);
    return NextResponse.json({ code: 'internal_error', error: 'Internal server error' }, { status: 500 });
  }
}
