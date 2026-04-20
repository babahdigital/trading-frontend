export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/vps/fleet-status');

/**
 * GET /api/admin/vps/fleet-status — Aggregate fleet health + sync status
 *
 * Returns totals (online, offline, degraded) and per-VPS detail
 * including sync status, code version, and last health check.
 */
export async function GET(_request: NextRequest) {
  try {
    const vpsInstances = await prisma.vpsInstance.findMany({
      select: {
        id: true,
        name: true,
        host: true,
        status: true,
        lastHealthCheckAt: true,
        lastHealthStatus: true,
        codeVersion: true,
        lastSyncStatus: true,
        lastSyncAt: true,
        seedChecksum: true,
        syncTokenCiphertext: true,
        _count: { select: { licenses: true } },
      },
      orderBy: { name: 'asc' },
    });

    const latestVersion = process.env.VPS_LATEST_CODE_VERSION || null;

    const fleet = vpsInstances.map((vps) => ({
      id: vps.id,
      name: vps.name,
      host: vps.host,
      status: vps.status,
      lastHealthCheckAt: vps.lastHealthCheckAt,
      lastHealthStatus: vps.lastHealthStatus,
      codeVersion: vps.codeVersion,
      isUpToDate: latestVersion ? vps.codeVersion === latestVersion : null,
      lastSyncStatus: vps.lastSyncStatus,
      lastSyncAt: vps.lastSyncAt,
      hasSeedChecksum: !!vps.seedChecksum,
      hasSyncToken: !!vps.syncTokenCiphertext,
      licenseCount: vps._count.licenses,
    }));

    const summary = {
      total: fleet.length,
      online: fleet.filter((v) => v.status === 'ONLINE').length,
      offline: fleet.filter((v) => v.status === 'OFFLINE').length,
      provisioning: fleet.filter((v) => v.status === 'PROVISIONING').length,
      suspended: fleet.filter((v) => v.status === 'SUSPENDED').length,
      healthy: fleet.filter((v) => v.lastHealthStatus === 'ok').length,
      degraded: fleet.filter((v) => v.lastHealthStatus === 'degraded').length,
      unreachable: fleet.filter((v) => v.lastHealthStatus === 'unreachable').length,
      outdated: latestVersion
        ? fleet.filter((v) => v.codeVersion && v.codeVersion !== latestVersion).length
        : null,
    };

    return NextResponse.json({ summary, fleet, latestVersion });
  } catch (error) {
    log.error('Fleet status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
