export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/vps/[id]');

/**
 * GET /api/admin/vps/[id] — Single VPS instance detail
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const vps = await prisma.vpsInstance.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        backendBaseUrl: true,
        status: true,
        lastHealthCheckAt: true,
        lastHealthStatus: true,
        codeVersion: true,
        lastSyncStatus: true,
        lastSyncAt: true,
        seedChecksum: true,
        syncTokenCiphertext: true,
        notes: true,
        createdAt: true,
        customerCode: true,
        _count: { select: { licenses: true } },
        healthChecks: {
          orderBy: { checkedAt: 'desc' },
          take: 5,
          select: {
            id: true,
            checkedAt: true,
            httpStatus: true,
            responseTimeMs: true,
            zmqConnected: true,
            dbOk: true,
            lastTickAge: true,
          },
        },
        licenses: {
          select: {
            id: true,
            licenseKey: true,
            status: true,
            type: true,
            expiresAt: true,
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vps) {
      return NextResponse.json({ error: 'VPS not found' }, { status: 404 });
    }

    const latestVersion = process.env.VPS_LATEST_CODE_VERSION || null;

    return NextResponse.json({
      ...vps,
      hasSeedChecksum: !!vps.seedChecksum,
      hasSyncToken: !!vps.syncTokenCiphertext,
      isUpToDate: latestVersion ? vps.codeVersion === latestVersion : null,
      licenseCount: vps._count.licenses,
      // Don't expose raw ciphertext/checksum
      seedChecksum: undefined,
      syncTokenCiphertext: undefined,
    });
  } catch (error) {
    log.error('VPS detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
