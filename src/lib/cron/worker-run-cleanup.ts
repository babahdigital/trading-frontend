import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/worker-run-cleanup');

const RETENTION_DAYS = 30;

export async function runWorkerRunCleanup(): Promise<{ removed: number }> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const result = await prisma.workerRun.deleteMany({
    where: {
      startedAt: { lt: cutoff },
      status: 'OK',
      itemsProcessed: 0,
    },
  });

  if (result.count > 0) {
    log.info(`pruned ${result.count} zero-item WorkerRun rows older than ${RETENTION_DAYS}d`);
  }
  return { removed: result.count };
}
