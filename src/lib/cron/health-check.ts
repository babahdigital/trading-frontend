import { prisma } from '@/lib/db/prisma';

// Health check cron: ping all ONLINE VPS instances every 5 minutes
export async function runHealthCheckCron() {
  const vpsInstances = await prisma.vpsInstance.findMany({
    where: { status: { in: ['ONLINE', 'PROVISIONING'] } },
  });

  console.log(`[health-check] Checking ${vpsInstances.length} VPS instances`);

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
        raw: raw ?? undefined,
      },
    });

    // Update VPS status
    await prisma.vpsInstance.update({
      where: { id: vps.id },
      data: {
        lastHealthCheckAt: new Date(),
        lastHealthStatus: healthStatus,
        // Mark as OFFLINE if unreachable 3+ consecutive times
        ...(healthStatus === 'unreachable' ? {} : { status: 'ONLINE' }),
      },
    });

    console.log(
      `[health-check] ${vps.name}: ${healthStatus} (${responseTimeMs}ms)`
    );
  }
}
