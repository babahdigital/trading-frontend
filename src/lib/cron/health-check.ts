import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { decryptAdminToken } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('health-check');

// Health check cron: ping all ONLINE VPS instances every 5 minutes
export async function runHealthCheckCron() {
  const vpsInstances = await prisma.vpsInstance.findMany({
    where: { status: { in: ['ONLINE', 'PROVISIONING'] } },
  });

  log.info(`Checking ${vpsInstances.length} VPS instances`);

  for (const vps of vpsInstances) {
    const startTime = Date.now();
    let httpStatus: number | null = null;
    let zmqConnected: boolean | null = null;
    let dbOk: boolean | null = null;
    let lastTickAge: number | null = null;
    let raw: Record<string, unknown> | null = null;

    try {
      const resp = await fetch(`${vps.backendBaseUrl}/health`, {
        signal: AbortSignal.timeout(10_000),
      });
      httpStatus = resp.status;

      if (resp.ok) {
        const data = await resp.json() as Record<string, unknown>;
        raw = data;
        zmqConnected = data.zmq_connected as boolean ?? null;
        dbOk = data.database_ok as boolean ?? null;
        lastTickAge = data.last_tick_age as number ?? null;
      }
    } catch {
      httpStatus = null;
    }

    const responseTimeMs = Date.now() - startTime;
    const healthStatus = httpStatus === 200 ? 'ok'
      : httpStatus ? 'degraded'
      : 'unreachable';

    await prisma.healthCheck.create({
      data: {
        vpsInstanceId: vps.id,
        httpStatus,
        responseTimeMs,
        zmqConnected,
        dbOk,
        lastTickAge,
        raw: raw as Prisma.InputJsonValue ?? undefined,
      },
    });

    // Poll sync-status and code-version from customer VPS (best-effort)
    const fleetUpdate: Record<string, unknown> = {
      lastHealthCheckAt: new Date(),
      lastHealthStatus: healthStatus,
    };

    if (healthStatus !== 'unreachable') {
      fleetUpdate.status = 'ONLINE';

      try {
        const adminToken = decryptAdminToken(
          vps.adminTokenCiphertext,
          vps.adminTokenIv,
          vps.adminTokenTag
        );
        const headers = {
          'X-API-Token': adminToken,
          'User-Agent': 'vps2-fleet-manager/1.0',
        };

        // Poll sync-status
        const syncResp = await fetch(`${vps.backendBaseUrl}/api/admin/customer-support/sync-status`, {
          headers,
          signal: AbortSignal.timeout(5_000),
        });
        if (syncResp.ok) {
          const syncData = await syncResp.json() as Record<string, unknown>;
          fleetUpdate.lastSyncStatus = (syncData.status as string) || 'unknown';
          fleetUpdate.lastSyncAt = new Date();
        }

        // Poll code-version
        const versionResp = await fetch(`${vps.backendBaseUrl}/api/admin/customer-support/code-version`, {
          headers,
          signal: AbortSignal.timeout(5_000),
        });
        if (versionResp.ok) {
          const versionData = await versionResp.json() as Record<string, unknown>;
          const version = (versionData.version as string) || (versionData.code_version as string) || null;
          if (version) {
            fleetUpdate.codeVersion = version;
          }
        }
      } catch (err) {
        log.warn(`Fleet polling failed for ${vps.name}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    await prisma.vpsInstance.update({
      where: { id: vps.id },
      data: fleetUpdate,
    });

    log.info(`${vps.name}: ${healthStatus} (${responseTimeMs}ms)`);
  }
}
