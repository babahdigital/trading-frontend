import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getHealth } from '@/lib/vps1/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

const WORKER_SCOPES: Array<{
  key: string;
  label: string;
  /** Max age before worker is considered stale (ms) */
  staleAfterMs: number;
}> = [
  { key: 'signals', label: 'Sinyal Trading', staleAfterMs: 10 * 60 * 1000 },             // 10m (runs every 30s)
  { key: 'trade_events', label: 'Event Trading', staleAfterMs: 10 * 60 * 1000 },          // 10m (runs every 20s)
  { key: 'research_ingester', label: 'Pengimpor Riset', staleAfterMs: 7 * 60 * 60 * 1000 }, // 7h (runs every 6h)
];

export async function GET() {
  // Fetch the latest run per worker separately so high-frequency workers
  // (signals/trade_events ~300 runs/h) can't push low-frequency ones
  // (research_ingester every 6h) out of the result window. Previous
  // implementation used a single findMany({ take: 100 }) which only ever
  // returned signals/trade_events rows once they accumulated past 100 —
  // the research ingester would then show "Not yet run / Degraded" even
  // though it had run successfully minutes earlier.
  const [dbOk, vps1, workerRunsPerScope, consumerStates, recentChecks] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    getHealth(),
    Promise.all(
      WORKER_SCOPES.map(({ key }) =>
        prisma.workerRun.findFirst({
          where: { worker: key },
          orderBy: { startedAt: 'desc' },
          select: { worker: true, startedAt: true, finishedAt: true, status: true, itemsProcessed: true, errorMessage: true },
        }),
      ),
    ),
    prisma.consumerState.findMany({
      select: { scope: true, lastRunAt: true, lastStatus: true, lastError: true, runCount: true, lastSeenId: true },
    }),
    prisma.healthCheck.findMany({
      orderBy: { checkedAt: 'desc' },
      take: 20,
      include: { vpsInstance: { select: { name: true } } },
    }),
  ]);

  const workerComponents = WORKER_SCOPES.map(({ label, staleAfterMs }, idx) => {
    const last = workerRunsPerScope[idx];
    if (!last) {
      return { name: label, status: 'degraded' as const, description: 'Belum pernah dijalankan' };
    }
    const ageMs = Date.now() - last.startedAt.getTime();
    const failed = last.status === 'ERROR';
    const stale = ageMs > staleAfterMs;
    const status = failed || stale ? 'degraded' as const : 'operational' as const;

    // Human-friendly age (Bahasa Indonesia)
    const mins = Math.round(ageMs / 60000);
    const ageStr = mins < 1 ? 'baru saja' : mins < 60 ? `${mins}m lalu` : `${Math.round(mins / 60)}j lalu`;

    const desc = failed
      ? `Jalan terakhir ${ageStr} — error: ${last.errorMessage?.slice(0, 80) ?? 'unknown'}`
      : `Jalan terakhir ${ageStr} — ${last.itemsProcessed} item`;
    return { name: label, status, description: desc };
  });

  const components = [
    {
      name: 'Portal BabahAlgo',
      status: 'operational' as const,
      description: 'Website publik, portal klien, dan CMS admin',
    },
    {
      name: 'Database',
      status: dbOk ? 'operational' as const : 'outage' as const,
      description: dbOk ? 'PostgreSQL terkoneksi' : 'PostgreSQL tidak terjangkau',
    },
    {
      name: 'Mesin Trading',
      status: vps1.ok ? 'operational' as const : 'degraded' as const,
      description: vps1.ok ? `Latensi ${vps1.latencyMs}ms` : `${vps1.error ?? 'Tidak terjangkau'} (${vps1.latencyMs}ms)`,
    },
    ...workerComponents,
  ];

  const overall = components.some((c) => c.status === 'outage')
    ? 'outage'
    : components.some((c) => c.status === 'degraded')
    ? 'degraded'
    : 'operational';

  return NextResponse.json({
    overall,
    components,
    workers: consumerStates.map((w) => ({
      scope: w.scope,
      lastRunAt: w.lastRunAt,
      lastStatus: w.lastStatus,
      lastError: w.lastError,
      runCount: w.runCount,
      lastSeenId: w.lastSeenId.toString(),
    })),
    recentHealthChecks: recentChecks.map((c) => ({
      name: c.vpsInstance?.name ?? 'unknown',
      checkedAt: c.checkedAt,
      httpStatus: c.httpStatus,
      responseTimeMs: c.responseTimeMs,
      dbOk: c.dbOk,
      zmqConnected: c.zmqConnected,
    })),
    timestamp: new Date().toISOString(),
  });
}
