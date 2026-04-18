import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getHealth } from '@/lib/vps1/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

export async function GET() {
  const [dbOk, vps1, workers, recentChecks] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    getHealth(),
    prisma.consumerState.findMany({
      select: { scope: true, lastRunAt: true, lastStatus: true, lastError: true, runCount: true, lastSeenId: true },
    }),
    prisma.healthCheck.findMany({
      orderBy: { checkedAt: 'desc' },
      take: 20,
      include: { vpsInstance: { select: { name: true } } },
    }),
  ]);

  const components = [
    {
      name: 'Frontend (VPS 2)',
      status: 'operational',
      description: 'Next.js app, CMS, and portal APIs',
    },
    {
      name: 'Database',
      status: dbOk ? 'operational' : 'outage',
      description: 'PostgreSQL primary',
    },
    {
      name: 'Trading Backend (VPS 1)',
      status: vps1.ok ? 'operational' : 'degraded',
      description: `Latency ${vps1.latencyMs}ms${vps1.error ? ` — ${vps1.error}` : ''}`,
    },
    {
      name: 'Signal Consumer',
      status: statusFromWorker(workers.find((w) => w.scope === 'signals')),
      description: workerDescription(workers.find((w) => w.scope === 'signals')),
    },
    {
      name: 'Trade Events Consumer',
      status: statusFromWorker(workers.find((w) => w.scope === 'trade_events')),
      description: workerDescription(workers.find((w) => w.scope === 'trade_events')),
    },
  ];

  const overall = components.some((c) => c.status === 'outage')
    ? 'outage'
    : components.some((c) => c.status === 'degraded')
    ? 'degraded'
    : 'operational';

  return NextResponse.json({
    overall,
    components,
    workers: workers.map((w) => ({
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

function statusFromWorker(w: { lastRunAt: Date | null; lastStatus: string | null } | undefined): 'operational' | 'degraded' | 'outage' {
  if (!w || !w.lastRunAt) return 'degraded';
  const ageMs = Date.now() - w.lastRunAt.getTime();
  if (w.lastStatus === 'error') return 'degraded';
  if (ageMs > 10 * 60 * 1000) return 'outage';
  return 'operational';
}

function workerDescription(w: { lastRunAt: Date | null; lastStatus: string | null; runCount: number } | undefined): string {
  if (!w) return 'Not yet run';
  if (!w.lastRunAt) return `${w.runCount} runs total`;
  const mins = Math.round((Date.now() - w.lastRunAt.getTime()) / 60000);
  return `Last run ${mins}m ago, ${w.runCount} runs total (${w.lastStatus ?? 'n/a'})`;
}
