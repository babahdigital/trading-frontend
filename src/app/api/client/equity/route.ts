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
    const path = `/api/equity/history${queryString ? `?${queryString}` : ''}`;

    let response: Response;

    if (vpsInstanceId) {
      // Model A — VPS_INSTALLATION: legacy endpoint
      response = await proxyToVpsBackend(vpsInstanceId, path, { method: 'GET' });
      const data = await response.json();
      return NextResponse.json(data);
    }

    if (subscriptionId) {
      // Wave-29S-D / Wave-30 — backend trading-forex tidak punya endpoint
      // master-equity-curve canonical lagi. Sementara return graceful empty
      // sampai backend expose /api/forex/me/equity atau equivalent. FE
      // EquityCurve sudah handle empty state ("No equity data — connect VPS").
      log.info('equity endpoint: backend canonical not yet shipped, returning empty');
      return NextResponse.json({
        source: 'pending-backend',
        snapshots: [],
        note: 'Equity curve endpoint pending Wave-30 backend feature.',
      });
    }

    return NextResponse.json(
      { error: 'No VPS instance or subscription found' },
      { status: 400 }
    );
  } catch (error) {
    log.error('Client equity error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
