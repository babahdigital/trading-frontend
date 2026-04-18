import { prisma } from '@/lib/db/prisma';

export async function getLastSeenId(scope: string): Promise<bigint> {
  const s = await prisma.consumerState.findUnique({ where: { scope } });
  return s?.lastSeenId ?? 0n;
}

export async function commitConsumerProgress(
  scope: string,
  lastSeenId: bigint,
  status: 'ok' | 'error',
  extras: { error?: string; processed?: number } = {},
): Promise<void> {
  await prisma.consumerState.upsert({
    where: { scope },
    create: {
      scope,
      lastSeenId,
      lastRunAt: new Date(),
      lastStatus: status,
      lastError: extras.error ?? null,
      runCount: 1,
    },
    update: {
      lastSeenId,
      lastRunAt: new Date(),
      lastStatus: status,
      lastError: extras.error ?? null,
      runCount: { increment: 1 },
    },
  });
}
