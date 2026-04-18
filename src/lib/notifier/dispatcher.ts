import { prisma } from '@/lib/db/prisma';
import { sendTelegram } from './telegram';
import { sendEmail } from './email';
import { formatSignalTelegram, formatSignalEmail } from '@/lib/formatters/signal-formatter';
import type { Signal } from '@/types/signal';
import type { Subscription, User } from '@prisma/client';
import { createLogger } from '@/lib/logger';

const log = createLogger('dispatcher');

export interface DispatchResult {
  signalId: number;
  sent: number;
  failed: number;
  skipped: number;
}

export async function dispatchSignalToSubscribers(signal: Signal): Promise<DispatchResult> {
  const result: DispatchResult = { signalId: signal.id, sent: 0, failed: 0, skipped: 0 };

  const subscribers = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gt: new Date() },
      tier: { in: ['SIGNAL_BASIC', 'SIGNAL_VIP'] },
    },
    include: { user: true },
  });

  log.info(`Signal ${signal.id}: ${subscribers.length} eligible subscribers`);

  const filtered = subscribers.filter((sub) => {
    if (sub.tier === 'SIGNAL_BASIC' && signal.confidence < 0.80) {
      result.skipped++;
      return false;
    }
    return signal.confidence >= 0.70;
  });

  await Promise.allSettled(
    filtered.map((sub) =>
      dispatchToOne(sub, signal).then((outcome) => {
        if (outcome.success) result.sent++;
        else result.failed++;
      }),
    ),
  );

  return result;
}

async function dispatchToOne(
  subscription: Subscription & { user: User },
  signal: Signal,
): Promise<{ success: boolean }> {
  // Determine channels from notification preferences or default
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: subscription.userId },
  });
  const channels = (pref?.channels as string[] | null) ?? ['INAPP'];
  let successCount = 0;

  const subInfo = {
    tier: subscription.tier,
    language: pref?.language ?? 'id',
    timezone: pref?.timezone ?? 'Asia/Jakarta',
    user: { name: subscription.user.name, email: subscription.user.email },
  };

  for (const channel of channels) {
    try {
      if (channel === 'TELEGRAM' && subscription.user.telegramChatId) {
        const text = formatSignalTelegram(signal, subInfo);
        await sendTelegram(subscription.user.telegramChatId, text);
        await prisma.notificationLog.create({
          data: {
            userId: subscription.userId,
            channel: 'TELEGRAM',
            category: 'SIGNAL',
            refId: String(signal.id),
            payload: { pair: signal.pair, confidence: signal.confidence },
            status: 'SENT',
            deliveredAt: new Date(),
          },
        });
        successCount++;
      } else if (channel === 'EMAIL' && subscription.user.email) {
        const { subject, html } = formatSignalEmail(signal, subInfo);
        await sendEmail(subscription.user.email, subject, html);
        await prisma.notificationLog.create({
          data: {
            userId: subscription.userId,
            channel: 'EMAIL',
            category: 'SIGNAL',
            refId: String(signal.id),
            payload: { pair: signal.pair, confidence: signal.confidence },
            status: 'SENT',
            deliveredAt: new Date(),
          },
        });
        successCount++;
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error';
      await prisma.notificationLog.create({
        data: {
          userId: subscription.userId,
          channel: channel as 'TELEGRAM' | 'EMAIL' | 'WHATSAPP' | 'INAPP',
          category: 'SIGNAL',
          refId: String(signal.id),
          payload: { pair: signal.pair, confidence: signal.confidence },
          status: 'FAILED',
          errorMessage: errMsg.slice(0, 500),
        },
      });
      log.warn(`Dispatch failed for ${subscription.userId} via ${channel}: ${errMsg}`);
    }
  }

  return { success: successCount > 0 };
}
