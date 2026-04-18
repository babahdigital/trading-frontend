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
  { key: 'signals', label: 'Signal Consumer', staleAfterMs: 10 * 60 * 1000 },            // 10m (runs every 30s)
  { key: 'trade_events', label: 'Trade Events Consumer', staleAfterMs: 10 * 60 * 1000 },  // 10m (runs every 20s)
  { key: 'research_ingester', label: 'Research Ingester', staleAfterMs: 7 * 60 * 60 * 1000 }, // 7h (runs every 6h)
];

export async function GET() {
  const [dbOk, vps1, workerRuns, consumerStates, recentChecks] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    getHealth(),
    prisma.workerRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 100,
      select: { worker: true, startedAt: true, finishedAt: true, status: true, itemsProcessed: true, errorMessage: true },
    }),
    prisma.consumerState.findMany({
      select: { scope: true, lastRunAt: true, lastStatus: true, lastError: true, runCount: true, lastSeenId: true },
    }),
    prisma.healthCheck.findMany({
      orderBy: { checkedAt: 'desc' },
      take: 20,
      include: { vpsInstance: { select: { name: true } } },
    }),
  ]);

  const workerComponents = WORKER_SCOPES.map(({ key, label, staleAfterMs }) => {
    const last = workerRuns.find((r) => r.worker === key);
    if (!last) {
      return { name: label, status: 'degraded' as const, description: 'Not yet run' };
    }
    const ageMs = Date.now() - last.startedAt.getTime();
    const failed = last.status === 'ERROR';
    const stale = ageMs > staleAfterMs;
    const status = failed || stale ? 'degraded' as const : 'operational' as const;

    // Human-friendly age
    const mins = Math.round(ageMs / 60000);
    const ageStr = mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;

    const desc = failed
      ? `Last run ${ageStr} — error: ${last.errorMessage?.slice(0, 80) ?? 'unknown'}`
      : `Last run ${ageStr} — ${last.itemsProcessed} items`;
    return { name: label, status, description: desc };
  });

  const components = [
    {
      name: 'Frontend (VPS 2)',
      status: 'operational' as const,
      description: 'Next.js app, CMS, and portal APIs',
    },
    {
      name: 'Database',
      status: dbOk ? 'operational' as const : 'outage' as const,
      description: dbOk ? 'PostgreSQL connected' : 'PostgreSQL unreachable',
    },
    {
      name: 'Trading Backend (VPS 1)',
      status: vps1.ok ? 'operational' as const : 'degraded' as const,
      description: vps1.ok ? `Latency ${vps1.latencyMs}ms` : `${vps1.error ?? 'Unreachable'} (${vps1.latencyMs}ms)`,
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
