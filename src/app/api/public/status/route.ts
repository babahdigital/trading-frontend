import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getHealth } from '@/lib/vps1/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const revalidate = 0;

/**
 * Status snapshot endpoint — return raw enum codes + data, let client render
 * via i18n. Sebelumnya descriptions di-hardcode Bahasa Indonesia di server,
 * yang break saat user pilih locale EN.
 *
 * Returns:
 * - components[]: { name, status, descCode, descData? } — name pakai i18n key
 *   yang client resolve, descCode + descData supaya copy locale-aware.
 * - workers[]: raw consumerState rows
 * - recentHealthChecks[]: raw healthCheck rows
 */

type StatusEnum = 'operational' | 'degraded' | 'outage';

interface ComponentRow {
  /** i18n key reference (e.g. 'portal', 'database', 'trading_engine') — client resolve via status_components namespace */
  nameKey: string;
  status: StatusEnum;
  /** Description code enum supaya client render via i18n. Variants di status_components.desc.* */
  descCode: 'portal_ok' | 'db_ok' | 'db_down' | 'trading_engine_ok' | 'trading_engine_down' | 'worker_never_run' | 'worker_recent_ok' | 'worker_stale' | 'worker_error' | 'worker_cascade';
  /** Data interpolation untuk template — mins/items/error/latency. Optional fields. */
  descData?: { mins?: number; items?: number; error?: string; latency?: number };
}

/**
 * Workers yang frontend monitor — harus align dengan backend reality.
 * Per audit 2026-05-16:
 *   - signals: ada di backend src/background/signal_dispatcher_loop
 *   - pair_brief: ada di backend (consumerState menunjukkan runCount > 300)
 *   - trade_events: TIDAK ADA di backend → drop dari monitoring (fake permanent degraded)
 *   - research_ingester: TIDAK ADA di backend → drop
 *
 * Workers yang real di backend tapi belum di-monitor di sini bisa ditambah
 * setelah backend confirm naming convention.
 */
const WORKER_SCOPES: Array<{
  scope: string;
  nameKey: string;
  /** Max age before worker is considered stale (ms) */
  staleAfterMs: number;
}> = [
  { scope: 'signals', nameKey: 'signals', staleAfterMs: 10 * 60 * 1000 },         // 10m (runs every 30s di backend)
  { scope: 'pair_brief', nameKey: 'pair_brief', staleAfterMs: 30 * 60 * 1000 },   // 30m (pair brief generation)
];

export async function GET() {
  try {
  const [dbOk, vps1, workerRunsPerScope, consumerStates, recentChecks] = await Promise.all([
    prisma.$queryRaw`SELECT 1`.then(() => true).catch(() => false),
    getHealth(),
    Promise.all(
      WORKER_SCOPES.map(({ scope }) =>
        prisma.workerRun.findFirst({
          where: { worker: scope },
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

  // VPS1 cascade: kalau backend VPS1 unreachable, semua worker yang fetch
  // signals/events/pair-brief dari VPS1 akan error juga. Tandai sebagai
  // cascade biar UI bisa show "akibat VPS1 down" daripada show duplicate
  // error tiap worker yang misleading.
  const vps1Cascade = !vps1.ok;

  const workerComponents: ComponentRow[] = WORKER_SCOPES.map(({ nameKey, staleAfterMs }, idx) => {
    const last = workerRunsPerScope[idx];
    if (!last) {
      return { nameKey, status: 'degraded', descCode: 'worker_never_run' };
    }
    const ageMs = Date.now() - last.startedAt.getTime();
    const failed = last.status === 'ERROR';
    const stale = ageMs > staleAfterMs;
    const status: StatusEnum = failed || stale ? 'degraded' : 'operational';
    const mins = Math.max(0, Math.round(ageMs / 60000));

    if (failed) {
      // Cascade detection: kalau VPS1 down, jangan tampilkan error worker
      // sebagai separate issue — itu side-effect, akar masalah di VPS1.
      const descCode = vps1Cascade ? 'worker_cascade' : 'worker_error';
      return {
        nameKey,
        status,
        descCode,
        descData: { mins, error: (last.errorMessage ?? 'unknown').slice(0, 80) },
      };
    }
    if (stale) {
      return { nameKey, status, descCode: 'worker_stale', descData: { mins } };
    }
    return {
      nameKey,
      status,
      descCode: 'worker_recent_ok',
      descData: { mins, items: last.itemsProcessed ?? 0 },
    };
  });

  const components: ComponentRow[] = [
    { nameKey: 'portal', status: 'operational', descCode: 'portal_ok' },
    {
      nameKey: 'database',
      status: dbOk ? 'operational' : 'outage',
      descCode: dbOk ? 'db_ok' : 'db_down',
    },
    {
      nameKey: 'trading_engine',
      status: vps1.ok ? 'operational' : 'degraded',
      descCode: vps1.ok ? 'trading_engine_ok' : 'trading_engine_down',
      descData: {
        latency: vps1.latencyMs ?? 0,
        error: vps1.ok ? '' : (vps1.error ?? 'unreachable'),
      },
    },
    ...workerComponents,
  ];

  const overall: StatusEnum = components.some((c) => c.status === 'outage')
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
    // Deploy metadata untuk operational transparency
    deploy: {
      commit: process.env.GIT_COMMIT_SHA?.slice(0, 7) ?? null,
      version: process.env.APP_VERSION ?? '0.16.0',
      buildTime: process.env.BUILD_TIMESTAMP ?? null,
    },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
