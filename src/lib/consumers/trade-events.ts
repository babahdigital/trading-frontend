import { prisma } from '@/lib/db/prisma';
import { getPendingTradeEvents, ackTradeEvents, Vps1Error } from '@/lib/vps1/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('trade-events-consumer');
const SCOPE = 'trade_events';

export interface TradeEventConsumerResult {
  processed: number;
  status: 'ok' | 'error' | 'skipped';
  error?: string;
  durationMs: number;
}

function mapOutcome(closeReason?: string | null, profit?: number | null) {
  if (profit == null) return 'OPEN' as const;
  if (profit > 0) return 'WIN' as const;
  if (profit < 0) return 'LOSS' as const;
  return 'BREAKEVEN' as const;
}

export async function runTradeEventsConsumer(opts: { limit?: number } = {}): Promise<TradeEventConsumerResult> {
  const start = Date.now();
  const run = await prisma.workerRun.create({
    data: { worker: SCOPE, status: 'RUNNING' },
  });

  try {
    const events = await getPendingTradeEvents(opts.limit ?? 50);
    if (!events.length) {
      await prisma.workerRun.update({
        where: { id: run.id },
        data: { finishedAt: new Date(), status: 'OK', itemsProcessed: 0 },
      });
      return { processed: 0, status: 'skipped', durationMs: Date.now() - start };
    }

    const acked: number[] = [];
    for (const e of events) {
      try {
        const sid = BigInt(e.trade_id);
        // Upsert audit log: events act as updates when CLOSE comes in
        const existing = await prisma.signalAuditLog.findUnique({ where: { sourceId: sid } });
        if (e.event_type === 'OPEN' && !existing) {
          await prisma.signalAuditLog.create({
            data: {
              sourceId: sid,
              pair: e.pair,
              direction: e.direction,
              lot: e.lot != null ? String(e.lot) : null,
              entryPrice: e.price != null ? String(e.price) : null,
              stopLoss: e.stop_loss != null ? String(e.stop_loss) : null,
              takeProfit: e.take_profit != null ? String(e.take_profit) : null,
              confidence: e.confidence != null ? String(e.confidence) : null,
              reasoning: e.reasoning ?? null,
              indicatorSnapshot: (e.indicator_snapshot ?? undefined) as import('@prisma/client').Prisma.InputJsonValue | undefined,
              emittedAt: new Date(e.emitted_at),
              outcome: 'OPEN',
            },
          });
        } else if (e.event_type === 'MODIFY_SL' || e.event_type === 'MODIFY_TP') {
          await prisma.signalAuditLog.updateMany({
            where: { sourceId: sid },
            data: {
              stopLoss: e.stop_loss != null ? String(e.stop_loss) : undefined,
              takeProfit: e.take_profit != null ? String(e.take_profit) : undefined,
            },
          });
        } else if (e.event_type === 'CLOSE') {
          const outcome = mapOutcome(e.close_reason, e.profit_usd);
          await prisma.signalAuditLog.upsert({
            where: { sourceId: sid },
            create: {
              sourceId: sid,
              pair: e.pair,
              direction: e.direction,
              lot: e.lot != null ? String(e.lot) : null,
              entryPrice: e.price != null ? String(e.price) : null,
              emittedAt: new Date(e.emitted_at),
              outcome,
              closePrice: e.price != null ? String(e.price) : null,
              closeReason: e.close_reason ?? null,
              profitUsd: e.profit_usd != null ? String(e.profit_usd) : null,
              closedAt: new Date(e.emitted_at),
            },
            update: {
              outcome,
              closePrice: e.price != null ? String(e.price) : undefined,
              closeReason: e.close_reason ?? undefined,
              profitUsd: e.profit_usd != null ? String(e.profit_usd) : undefined,
              closedAt: new Date(e.emitted_at),
            },
          });
        }
        acked.push(e.sequence_number);
      } catch (err) {
        log.error(`Failed to process trade event ${e.sequence_number}:`, err);
      }
    }

    if (acked.length) {
      try {
        await ackTradeEvents(acked);
      } catch (err) {
        log.error('ack failed:', err);
      }
    }

    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'OK', itemsProcessed: acked.length },
    });
    return { processed: acked.length, status: 'ok', durationMs: Date.now() - start };
  } catch (err) {
    const msg = err instanceof Vps1Error ? `${err.status} ${err.message}` : err instanceof Error ? err.message : 'unknown';
    log.error('Trade events consumer failed:', msg);
    await prisma.workerRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), status: 'ERROR', errorMessage: msg },
    });
    return { processed: 0, status: 'error', error: msg, durationMs: Date.now() - start };
  }
}
