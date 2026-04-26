import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/whatsapp-cleanup');

/**
 * Prune stale WhatsappVerification rows.
 *
 * - Expired and never consumed rows: delete after 24 hours past expiresAt.
 *   Keeps a short audit window for support to investigate "I never got my code".
 * - Consumed rows: delete after 30 days. They have served their purpose;
 *   the verified target lives in the backend tenant config.
 */
export async function runWhatsappVerificationCleanup(): Promise<{
  expiredRemoved: number;
  consumedRemoved: number;
}> {
  const now = new Date();
  const expiredCutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const consumedCutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const expired = await prisma.whatsappVerification.deleteMany({
    where: {
      consumedAt: null,
      expiresAt: { lt: expiredCutoff },
    },
  });

  const consumed = await prisma.whatsappVerification.deleteMany({
    where: {
      consumedAt: { lt: consumedCutoff },
    },
  });

  if (expired.count > 0 || consumed.count > 0) {
    log.info(`pruned ${expired.count} expired + ${consumed.count} old consumed verifications`);
  }
  return { expiredRemoved: expired.count, consumedRemoved: consumed.count };
}
