import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/notifier/email';
import { addMonths } from 'date-fns';
import { createLogger } from '@/lib/logger';

const log = createLogger('subscription');

export async function activateSubscription(userId: string, tier: string) {
  const existing = await prisma.subscription.findFirst({
    where: { userId, tier: tier as 'SIGNAL_BASIC' | 'SIGNAL_VIP', status: 'ACTIVE' },
  });

  const startsAt = new Date();
  const expiresAt = existing
    ? addMonths(new Date(existing.expiresAt), 1)
    : addMonths(startsAt, 1);

  const subscription = await prisma.subscription.upsert({
    where: { id: existing?.id ?? `sub-${userId}-${tier}-${Date.now()}` },
    create: {
      userId,
      tier: tier as 'SIGNAL_BASIC' | 'SIGNAL_VIP',
      status: 'ACTIVE',
      startsAt,
      expiresAt,
      metadata: { activatedVia: 'payment' },
    },
    update: {
      expiresAt,
      status: 'ACTIVE',
    },
  });

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (user) {
    try {
      await sendEmail(
        user.email,
        'Subscription Aktif - BabahAlgo',
        `<p>Halo ${user.name || 'Trader'},</p>
         <p>Subscription <strong>${tier}</strong> Anda sudah aktif hingga ${expiresAt.toLocaleDateString('id-ID')}.</p>
         <p>Setup Telegram: <a href="https://babahalgo.com/portal/account/notifications">Portal Settings</a></p>`,
      );
    } catch (err) {
      log.warn(`Failed to send activation email to ${user.email}: ${err}`);
    }
  }

  return subscription;
}

/** Run daily to expire subscriptions and send renewal reminders */
export async function expireSubscriptions() {
  const now = new Date();

  const expired = await prisma.subscription.updateMany({
    where: { status: 'ACTIVE', expiresAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });

  if (expired.count > 0) {
    log.info(`Expired ${expired.count} subscriptions`);
  }

  // Send renewal reminder 3 days before expiry
  const reminderDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const expiring = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { gte: now, lte: reminderDate },
    },
    include: { user: true },
  });

  for (const sub of expiring) {
    try {
      await sendEmail(
        sub.user.email,
        'Subscription Akan Berakhir - 3 Hari Lagi',
        `<p>Halo ${sub.user.name || 'Trader'},</p>
         <p>Subscription ${sub.tier} Anda berakhir ${sub.expiresAt.toLocaleDateString('id-ID')}.</p>
         <p><a href="https://babahalgo.com/portal/billing">Perpanjang Sekarang</a></p>`,
      );
    } catch (err) {
      log.warn(`Failed to send renewal reminder to ${sub.user.email}: ${err}`);
    }
  }
}
