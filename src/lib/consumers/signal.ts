import { prisma } from '@/lib/db/prisma';
import { getLatestSignals, Vps1Error } from '@/lib/vps1/client';
import { commitConsumerProgress, getLastSeenId } from './state';
import { dispatchSignalToSubscribers } from '@/lib/notifier/dispatcher';
import type { Signal } from '@/types/signal';
import { createLogger } from '@/lib/logger';
import * as Sentry from '@sentry/nextjs';

const log = createLogger('signal-consumer');
const SCOPE = 'signals';

// Backend post-Wave-31 returns UUIDv7 string IDs. ConsumerState.lastSeenId
// is still BigInt (SignalAuditLog.sourceId too). Cursor uses emitted_at ms
// timestamp as BigInt — monotonic + no UUID parsing. sourceId derives a
// deterministic 63-bit hash from the UUID's first 64 bits (mirror Phase E
// backend pattern in forex_publisher._emit_outbox_open).
function uuidToInt64(uuid: string): bigint {
  const hex = uuid.replace(/-/g, '').slice(0, 16);
  if (!/^[0-9a-fA-F]{16}$/.test(hex)) {
    throw new Error(`uuidToInt64: not a valid UUID prefix: "${uuid}"`);
  }
  return BigInt('0x' + hex) & 0x7FFFFFFFFFFFFFFFn;
}

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
    // Cursor semantics: BigInt of last seen `emitted_at` in ms epoch.
    // Backwards-compat with pre-fix rows where lastSeenId was 0 (no cursor) —
    // pull last 50 from backend, filter client-side, persist newest emitted_at.
    const lastSeenMs = await getLastSeenId(SCOPE);
    const signals = await getLatestSignals({
      limit: opts.limit ?? 50,
      min_confidence: opts.minConfidence ?? 0.7,
    });
    const cursorMs = Number(lastSeenMs);
    const fresh = cursorMs > 0
      ? signals.filter((s) => new Date(s.emitted_at).getTime() > cursorMs)
      : signals;

    if (!fresh.length) {
      await commitConsumerProgress(SCOPE, lastSeenMs, 'ok', { processed: 0 });
      await prisma.workerRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 0 },
      });
      return { processed: 0, lastSeenId: lastSeenMs, status: 'skipped', durationMs: Date.now() - start };
    }

    let newestMs = cursorMs;
    for (const s of fresh) {
      try {
        const sid = uuidToInt64(s.id);
        const emittedMs = new Date(s.emitted_at).getTime();
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
        if (emittedMs > newestMs) newestMs = emittedMs;

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

    const newestBig = BigInt(newestMs);
    await commitConsumerProgress(SCOPE, newestBig, 'ok', { processed: fresh.length });
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'OK', itemsProcessed: fresh.length },
    });

    return {
      processed: fresh.length,
      lastSeenId: newestBig,
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
