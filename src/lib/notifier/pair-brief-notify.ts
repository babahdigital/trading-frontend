/**
 * Pair Brief Telegram Notification
 *
 * Sends formatted pair brief summaries to SIGNAL_VIP subscribers via Telegram.
 */

import { prisma } from '@/lib/db/prisma';
import { sendTelegram } from './telegram';
import { createLogger } from '@/lib/logger';
import type { PairDataBundle } from '@/lib/vps1/pair-data';

const log = createLogger('pair-brief-notify');

function formatPrice(n: number): string {
  return n >= 100 ? n.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : n.toFixed(5);
}

function buildTelegramMessage(pair: string, session: string, data: PairDataBundle, slug: string): string {
  const sessionLabel = session.replace('_', ' ');
  const lines: string[] = [
    `📊 *Pair Intelligence Brief*`,
    `*${pair}* — ${sessionLabel} Session`,
    `📅 ${new Date().toISOString().split('T')[0]}`,
    '',
    `*Bias:* ${data.fundamentalBias} (${data.signals.length} signals, avg conf ${data.avgConfidence})`,
    '',
  ];

  if (data.supportLevels.length > 0) {
    lines.push(`*Support:* ${data.supportLevels.slice(0, 3).map(formatPrice).join(' | ')}`);
  }
  if (data.resistanceLevels.length > 0) {
    lines.push(`*Resistance:* ${data.resistanceLevels.slice(0, 3).map(formatPrice).join(' | ')}`);
  }

  if (data.tradeIdeas.length > 0) {
    lines.push('', '*Trade Ideas:*');
    for (const idea of data.tradeIdeas.slice(0, 2)) {
      lines.push(`• ${idea.direction} @ ${formatPrice(idea.entry)} → TP ${formatPrice(idea.tp)} / SL ${formatPrice(idea.sl)}`);
    }
  }

  if (data.sndZones.length > 0) {
    lines.push('', '*SND Zones:*');
    for (const z of data.sndZones.slice(0, 3)) {
      lines.push(`• ${z.type} ${formatPrice(z.low)}-${formatPrice(z.high)} (${z.tf})`);
    }
  }

  lines.push(
    '',
    `🔗 [Baca selengkapnya](https://babahalgo.com/research/briefs/${slug})`,
    '',
    '_Disclaimer: Bukan saran investasi. Trading berisiko tinggi._',
  );

  return lines.join('\n');
}

/**
 * Send pair brief notification to all SIGNAL_VIP subscribers with telegramChatId.
 */
export async function notifyVipSubscribers(
  pair: string,
  session: string,
  data: PairDataBundle,
  slug: string,
): Promise<void> {
  const vipSubscribers = await prisma.subscription.findMany({
    where: {
      tier: 'SIGNAL_VIP',
      status: 'ACTIVE',
      user: { telegramChatId: { not: null } },
    },
    include: { user: { select: { id: true, telegramChatId: true } } },
  });

  if (vipSubscribers.length === 0) {
    log.info('No VIP subscribers with Telegram — skipping notifications');
    return;
  }

  const message = buildTelegramMessage(pair, session, data, slug);

  for (const sub of vipSubscribers) {
    const chatId = sub.user.telegramChatId;
    if (!chatId) continue;

    try {
      await sendTelegram(chatId, message);
      await prisma.notificationLog.create({
        data: {
          userId: sub.user.id,
          channel: 'TELEGRAM',
          category: 'PAIR_BRIEF',
          refId: slug,
          payload: { pair, session },
          status: 'SENT',
          deliveredAt: new Date(),
        },
      });
    } catch (err) {
      log.warn(`Failed to send brief to ${chatId}: ${err instanceof Error ? err.message : 'unknown'}`);
      await prisma.notificationLog.create({
        data: {
          userId: sub.user.id,
          channel: 'TELEGRAM',
          category: 'PAIR_BRIEF',
          refId: slug,
          payload: { pair, session },
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'unknown',
        },
      });
    }
  }

  log.info(`Sent pair brief notifications to ${vipSubscribers.length} VIP subscribers`);
}
