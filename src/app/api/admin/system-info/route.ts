export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';

/**
 * Aggregated system observability snapshot for admin settings page.
 *
 * Purposely read-only. No action endpoints here — those live under
 * /api/admin/{feature}/* so permissions + rate limits stay modular.
 */

const FEATURE_FLAGS = [
  'ENABLE_SIGNAL_CONSUMER',
  'ENABLE_TRADE_EVENTS_CONSUMER',
  'ENABLE_RESEARCH_INGESTER',
  'ENABLE_PAIR_BRIEF_WORKER',
  'ENABLE_BLOG_GENERATOR',
] as const;

function flagValue(name: string): 'on' | 'off' {
  const v = process.env[name];
  if (!v) return 'off';
  return v === '1' || v.toLowerCase() === 'true' ? 'on' : 'off';
}

function presenceOf(name: string): 'configured' | 'missing' {
  return process.env[name] ? 'configured' : 'missing';
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const start = Date.now();

  const [sessionCount, activeSessionCount, workerRunsRaw, aiCallsSummary, licenseStats, vpsStats, topicStats] = await Promise.all([
    prisma.session.count(),
    prisma.session.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
    prisma.workerRun.findMany({
      orderBy: { startedAt: 'desc' },
      take: 10,
      select: { worker: true, status: true, startedAt: true, finishedAt: true, itemsProcessed: true, errorMessage: true },
    }),
    prisma.aiCallLog.groupBy({
      by: ['purpose'],
      _sum: { inputTokens: true, outputTokens: true },
      _count: { _all: true },
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.license.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.vpsInstance.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.blogTopic.groupBy({ by: ['status'], _count: { _all: true } }).catch(() => []),
  ]);

  const workerSummary = await prisma.workerRun.groupBy({
    by: ['worker'],
    _max: { startedAt: true, finishedAt: true },
    _count: { _all: true },
  });

  const packageJson = await import('../../../../../package.json').then((m) => m.default).catch(() => ({ version: 'unknown' } as { version: string }));

  return NextResponse.json({
    app: {
      name: 'trading-apifrontend',
      version: (packageJson as { version: string }).version,
      node: process.version,
      platform: process.platform,
      env: process.env.NODE_ENV ?? 'unknown',
      uptimeSeconds: Math.floor(process.uptime()),
    },
    database: {
      ok: true,
      queryLatencyMs: Date.now() - start,
    },
    flags: Object.fromEntries(FEATURE_FLAGS.map((f) => [f, flagValue(f)])),
    secrets: {
      JWT_SECRET: presenceOf('JWT_SECRET'),
      LICENSE_MW_MASTER_KEY: presenceOf('LICENSE_MW_MASTER_KEY'),
      CRON_SECRET: presenceOf('CRON_SECRET'),
      OPENROUTER_API_KEY: presenceOf('OPENROUTER_API_KEY'),
      VPS1_BACKEND_URL: presenceOf('VPS1_BACKEND_URL'),
      VPS1_ADMIN_TOKEN: presenceOf('VPS1_ADMIN_TOKEN'),
      MIDTRANS_SERVER_KEY: presenceOf('MIDTRANS_SERVER_KEY'),
      XENDIT_SECRET_KEY: presenceOf('XENDIT_SECRET_KEY'),
      TELEGRAM_BOT_TOKEN: presenceOf('TELEGRAM_BOT_TOKEN'),
      BREVO_API_KEY: presenceOf('BREVO_API_KEY'),
      SENTRY_DSN: presenceOf('SENTRY_DSN'),
    },
    sessions: {
      total: sessionCount,
      active: activeSessionCount,
    },
    licenses: Object.fromEntries(licenseStats.map((s) => [s.status, s._count._all])),
    vps: Object.fromEntries(vpsStats.map((s) => [s.status, s._count._all])),
    blogTopics: Object.fromEntries(topicStats.map((s) => [s.status, s._count._all])),
    workers: {
      recent: workerRunsRaw,
      summary: workerSummary.map((w) => ({
        worker: w.worker,
        runCount: w._count._all,
        lastStartedAt: w._max.startedAt,
        lastFinishedAt: w._max.finishedAt,
      })),
    },
    ai: {
      last7Days: aiCallsSummary.map((c) => ({
        purpose: c.purpose,
        calls: c._count._all,
        inputTokens: c._sum.inputTokens ?? 0,
        outputTokens: c._sum.outputTokens ?? 0,
      })),
    },
    generatedAt: new Date().toISOString(),
  });
}
