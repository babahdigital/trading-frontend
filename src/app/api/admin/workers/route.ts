export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/workers');

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    // Get distinct workers
    const workers = await prisma.workerRun.findMany({
      distinct: ['worker'],
      select: { worker: true },
      orderBy: { worker: 'asc' },
    });

    // For each worker: aggregate counts by status + get last run
    const workerSummaries = await Promise.all(
      workers.map(async ({ worker }) => {
        const [statusCounts, lastRun] = await Promise.all([
          prisma.workerRun.groupBy({
            by: ['status'],
            where: { worker },
            _count: { status: true },
          }),
          prisma.workerRun.findFirst({
            where: { worker },
            orderBy: { startedAt: 'desc' },
            select: { startedAt: true, finishedAt: true, status: true },
          }),
        ]);

        const okCount = statusCounts
          .filter((s) => s.status === 'OK' || s.status === 'SUCCESS')
          .reduce((acc, s) => acc + s._count.status, 0);
        const errorCount = statusCounts
          .filter((s) => s.status === 'ERROR' || s.status === 'FAILED')
          .reduce((acc, s) => acc + s._count.status, 0);
        const runningCount = statusCounts
          .filter((s) => s.status === 'RUNNING')
          .reduce((acc, s) => acc + s._count.status, 0);
        const totalCount = statusCounts.reduce((acc, s) => acc + s._count.status, 0);
        const errorRate = totalCount > 0 ? (errorCount / totalCount) * 100 : 0;

        return {
          worker,
          okCount,
          errorCount,
          runningCount,
          totalCount,
          errorRate,
          lastRun: lastRun
            ? {
                startedAt: lastRun.startedAt,
                finishedAt: lastRun.finishedAt,
                status: lastRun.status,
              }
            : null,
        };
      }),
    );

    // Recent errors across all workers (last 50)
    const recentErrors = await prisma.workerRun.findMany({
      where: {
        status: { in: ['ERROR', 'FAILED'] },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        worker: true,
        startedAt: true,
        finishedAt: true,
        status: true,
        errorMessage: true,
        itemsProcessed: true,
      },
    });

    return NextResponse.json({
      workers: workerSummaries,
      recentErrors,
    });
  } catch (error) {
    log.error('List worker runs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
