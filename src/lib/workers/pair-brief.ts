/**
 * Pair Brief Worker
 *
 * Generates Pair Intelligence Briefs by:
 * 1. Fetching data from VPS1 for configured pairs
 * 2. Generating AI narrative (with anti-hallucination)
 * 3. Validating output against source data
 * 4. Publishing and notifying subscribers
 */

import { prisma } from '@/lib/db/prisma';
import { fetchPairData } from '@/lib/vps1/pair-data';
import { generatePairBriefNarrative } from '@/lib/ai/pair-brief-generator';
import { validateBriefNarrative } from '@/lib/ai/pair-brief-validator';
import { createLogger } from '@/lib/logger';
import type { TradingSession, Prisma } from '@prisma/client';

const log = createLogger('pair-brief-worker');
const WORKER = 'pair_brief';

// MVP: single pair. Expand later.
const CONFIGURED_PAIRS = ['BTCUSD'];

/**
 * Determine current trading session based on UTC hour.
 * Asian: 00:00-08:00 UTC
 * London: 07:00-16:00 UTC
 * New York: 13:00-22:00 UTC
 */
function getCurrentSession(): TradingSession {
  const hour = new Date().getUTCHours();
  if (hour >= 13 && hour < 22) return 'NEW_YORK';
  if (hour >= 7 && hour < 16) return 'LONDON';
  return 'ASIAN';
}

function buildSlug(pair: string, date: string, session: string): string {
  return `${pair.toLowerCase()}-${date}-${session.toLowerCase().replace('_', '-')}`;
}

export interface PairBriefWorkerResult {
  status: 'ok' | 'error' | 'skipped';
  briefsGenerated: number;
  briefsSkipped: number;
  errors: string[];
  durationMs: number;
}

export async function runPairBriefWorker(): Promise<PairBriefWorkerResult> {
  const start = Date.now();
  const run = await prisma.workerRun.create({
    data: { worker: WORKER, status: 'RUNNING' },
  });

  const session = getCurrentSession();
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const errors: string[] = [];
  let generated = 0;
  let skipped = 0;

  try {
    for (const pair of CONFIGURED_PAIRS) {
      const slug = buildSlug(pair, today, session);

      // Check if brief already exists for this pair/session/date
      const existing = await prisma.pairBrief.findUnique({ where: { slug } });
      if (existing) {
        log.info(`Brief already exists: ${slug}, skipping`);
        skipped++;
        continue;
      }

      // Step 1: Fetch data from VPS1
      log.info(`Fetching VPS1 data for ${pair}...`);
      const data = await fetchPairData(pair);
      if (!data) {
        log.warn(`No VPS1 data for ${pair} — skipping brief generation`);
        skipped++;
        continue;
      }

      // Step 2: Generate AI narrative
      log.info(`Generating narrative for ${pair} ${session}...`);
      const brief = await generatePairBriefNarrative(data, session);

      // Step 3: Validate narrative against source data
      const validation = validateBriefNarrative(brief.narrative, data);
      const validationStatus = validation.valid ? 'PASSED' : 'FAILED';

      if (!validation.valid) {
        log.warn(`Validation failed for ${slug}: ${validation.errors.join('; ')}`);
      }

      // Step 4: Upsert brief — publish only if validation passed
      const dateObj = new Date(today + 'T00:00:00Z');
      await prisma.pairBrief.create({
        data: {
          pair,
          session,
          date: dateObj,
          slug,
          supportLevels: data.supportLevels as Prisma.InputJsonValue,
          resistanceLevels: data.resistanceLevels as Prisma.InputJsonValue,
          sndZones: data.sndZones as unknown as Prisma.InputJsonValue,
          confluenceScore: data.avgConfidence,
          fundamentalBias: data.fundamentalBias,
          keyPatterns: data.keyPatterns as unknown as Prisma.InputJsonValue,
          fakeLiquidity: data.fakeLiquidity as unknown as Prisma.InputJsonValue,
          signalSnapshot: {
            signalCount: data.signals.length,
            fetchedAt: data.fetchedAt,
            signalIds: data.signals.map((s) => s.id),
          } as Prisma.InputJsonValue,
          narrative: brief.narrative,
          narrative_en: brief.narrative_en,
          tradeIdeas: data.tradeIdeas as unknown as Prisma.InputJsonValue,
          accessTier: 'SIGNAL_BASIC',
          aiModel: brief.aiModel,
          aiTokensUsed: brief.aiTokensUsed,
          validationStatus: validationStatus as 'PASSED' | 'FAILED',
          validationErrors: validation.errors as Prisma.InputJsonValue,
          isPublished: validation.valid,
          publishedAt: validation.valid ? new Date() : null,
        },
      });

      generated++;
      log.info(`Brief created: ${slug} (validation: ${validationStatus})`);

      // Step 5: Notify VIP subscribers if published
      if (validation.valid) {
        try {
          const { notifyVipSubscribers } = await import('@/lib/notifier/pair-brief-notify');
          await notifyVipSubscribers(pair, session, data, slug);
        } catch (err) {
          log.warn(`VIP notification failed for ${slug}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      }
    }

    // Update consumer state
    await prisma.consumerState.upsert({
      where: { scope: WORKER },
      create: {
        scope: WORKER,
        lastRunAt: new Date(),
        lastStatus: generated > 0 ? 'OK' : 'SKIPPED',
        runCount: 1,
      },
      update: {
        lastRunAt: new Date(),
        lastStatus: generated > 0 ? 'OK' : (skipped > 0 ? 'SKIPPED' : 'NO_DATA'),
        runCount: { increment: 1 },
      },
    });

    await prisma.workerRun.update({
      where: { id: run.id },
      data: {
        finishedAt: new Date(),
        status: errors.length > 0 ? 'PARTIAL' : 'OK',
        itemsProcessed: generated,
        metadata: { session, date: today, skipped, errors },
      },
    });

    return {
      status: errors.length > 0 ? 'error' : (generated > 0 ? 'ok' : 'skipped'),
      briefsGenerated: generated,
      briefsSkipped: skipped,
      errors,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    log.error('Pair brief worker failed:', msg);

    await prisma.consumerState.upsert({
      where: { scope: WORKER },
      create: { scope: WORKER, lastRunAt: new Date(), lastStatus: 'ERROR', lastError: msg, runCount: 1 },
      update: { lastRunAt: new Date(), lastStatus: 'ERROR', lastError: msg, runCount: { increment: 1 } },
    });

    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'ERROR', errorMessage: msg },
    });

    return { status: 'error', briefsGenerated: generated, briefsSkipped: skipped, errors: [msg], durationMs: Date.now() - start };
  }
}
