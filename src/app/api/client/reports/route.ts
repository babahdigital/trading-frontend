export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToVpsBackend, proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/reports');

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

    let response: Response;

    if (vpsInstanceId) {
      response = await proxyToVpsBackend(vpsInstanceId, '/api/report/today', {
        method: 'GET',
      });
    } else if (subscriptionId) {
      response = await proxyToMasterBackend('/api/report/today', {
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
    log.error('Client reports error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
