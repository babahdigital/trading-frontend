import { prisma } from '@/lib/db/prisma';
import { getLatestSignals, Vps1Error } from '@/lib/vps1/client';
import { commitConsumerProgress, getLastSeenId } from './state';
import { dispatchSignalToSubscribers } from '@/lib/notifier/dispatcher';
import type { Signal } from '@/types/signal';
import { createLogger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

const log = createLogger('signal-consumer');
const SCOPE = 'signals';

export interface SignalConsumerResult {
  processed: number;
  lastSeenId: bigint;
  status: 'ok' | 'error' | 'skipped';
  error?: string;
  durationMs: number;
}

export async function runSignalConsumer(opts: {
  limit?: number;
  minConfidence?: number;
} = {}): Promise<SignalConsumerResult> {
  const start = Date.now();
  const run = await prisma.workerRun.create({
    data: { worker: SCOPE, status: 'RUNNING' },
  });

  try {
    const lastSeenId = await getLastSeenId(SCOPE);
    const signals = await getLatestSignals({
      since_id: lastSeenId,
      limit: opts.limit ?? 50,
      min_confidence: opts.minConfidence ?? 0.7,
    });

    if (!signals.length) {
      await commitConsumerProgress(SCOPE, lastSeenId, 'ok', { processed: 0 });
      await prisma.workerRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 0 },
      });
      return { processed: 0, lastSeenId, status: 'skipped', durationMs: Date.now() - start };
    }

    let highest = lastSeenId;
    for (const s of signals) {
      try {
        const sid = BigInt(s.id);
        await prisma.signalAuditLog.upsert({
          where: { sourceId: sid },
          create: {
            sourceId: sid,
            pair: s.pair,
            direction: s.direction,
            entryType: s.entry_type ?? null,
            lot: s.lot != null ? String(s.lot) : null,
            entryPrice: s.entry_price != null ? String(s.entry_price) : null,
            stopLoss: s.stop_loss != null ? String(s.stop_loss) : null,
            takeProfit: s.take_profit != null ? String(s.take_profit) : null,
            confidence: s.confidence != null ? String(s.confidence) : null,
            reasoning: s.reasoning ?? null,
            indicatorSnapshot: (s.indicator_snapshot ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
            emittedAt: new Date(s.emitted_at),
            outcome: 'OPEN',
          },
          update: {},
        });
        if (sid > highest) highest = sid;

        // Dispatch to subscribers via Telegram/Email
        try {
          const dispatchSignal: Signal = {
            id: s.id,
            emitted_at: s.emitted_at,
            pair: s.pair,
            direction: s.direction,
            entry_type: s.entry_type ?? 'unknown',
            confidence: s.confidence ?? 0,
            market_condition: null,
            entry_price_hint: s.entry_price ?? null,
            take_profit: s.take_profit ?? null,
            stop_loss: s.stop_loss ?? null,
            reasoning: s.reasoning ?? '',
            indicator_snapshot_summary: s.indicator_snapshot ?? {},
          };
          const dispatch = await dispatchSignalToSubscribers(dispatchSignal);
          log.info(`Signal ${s.id}: dispatched to ${dispatch.sent} subs, ${dispatch.failed} failed, ${dispatch.skipped} skipped`);
        } catch (dispatchErr) {
          log.error(`Signal ${s.id} dispatch failed:`, dispatchErr);
        }
      } catch (err) {
        log.error(`Failed to persist signal ${s.id}:`, err);
      }
    }

    await commitConsumerProgress(SCOPE, highest, 'ok', { processed: signals.length });
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'OK', itemsProcessed: signals.length },
    });

    return {
      processed: signals.length,
      lastSeenId: highest,
      status: 'ok',
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const msg = err instanceof Vps1Error ? `${err.status} ${err.message}` : err instanceof Error ? err.message : 'unknown';
    log.error('Signal consumer failed:', msg);
    Sentry.captureException(err, { tags: { worker: 'signal-consumer' } });
    await commitConsumerProgress(SCOPE, await getLastSeenId(SCOPE), 'error', { error: msg });
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'ERROR', errorMessage: msg },
    });
    return {
      processed: 0,
      lastSeenId: await getLastSeenId(SCOPE),
      status: 'error',
      error: msg,
      durationMs: Date.now() - start,
    };
  }
}
