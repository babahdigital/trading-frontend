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

/**
 * Cancel active subscription. Source bisa dari webhook upstream
 * (Stripe subscription.deleted, Midtrans cancel, Xendit expired-recurring).
 *
 * Strategy:
 *   - Forex/general subscription → flip Subscription.status = 'CANCELLED'
 *   - Crypto subscription → flip CryptoBotSubscription.status = 'CANCELLED'
 *   - Both: set cancelledAt timestamp untuk audit + reactivation grace
 *   - Email user supaya tahu bot stops
 *
 * Backend rc37 chain: backend already cancel di backend-side via webhook
 * pipeline; FE update mirror untuk sync portal display.
 */
export async function cancelSubscription(
  userId: string,
  opts?: { tier?: string; reason?: string; source?: 'stripe' | 'midtrans' | 'xendit' | 'manual' },
): Promise<{ subscriptionCancelled: number; cryptoCancelled: boolean }> {
  const now = new Date();
  const reason = opts?.reason ?? 'upstream_webhook';
  const source = opts?.source ?? 'manual';

  // Schema design: cancellation metadata stored di `metadata` JSON field
  // (Subscription model) supaya tidak butuh migration baru. Backend rc37
  // sudah cancel di backend-side; FE update mirror untuk portal display.
  const where = opts?.tier
    ? { userId, tier: opts.tier as 'SIGNAL_BASIC' | 'SIGNAL_VIP', status: 'ACTIVE' as const }
    : { userId, status: 'ACTIVE' as const };

  // updateMany doesn't return updated rows — fetch first untuk merge metadata
  const targets = await prisma.subscription.findMany({ where, select: { id: true, metadata: true } });
  for (const t of targets) {
    const mergedMeta = {
      ...(typeof t.metadata === 'object' && t.metadata !== null ? t.metadata : {}),
      cancelledAt: now.toISOString(),
      cancellationReason: reason,
      cancellationSource: source,
    };
    await prisma.subscription.update({
      where: { id: t.id },
      data: { status: 'CANCELLED', metadata: mergedMeta },
    });
  }
  const result = { count: targets.length };

  // Crypto subscription model terpisah — saat backend cancel mirror lokal
  // supaya portal display sync (backend RLS akan reject query anyway,
  // tapi UX lebih jelas tanpa hit backend).
  let cryptoCancelled = false;
  const cryptoSub = await prisma.cryptoBotSubscription.findUnique({
    where: { userId },
    select: { status: true },
  });
  if (cryptoSub && cryptoSub.status === 'ACTIVE') {
    await prisma.cryptoBotSubscription.update({
      where: { userId },
      data: { status: 'CANCELLED' },
    });
    cryptoCancelled = true;
  }

  if (result.count > 0 || cryptoCancelled) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      try {
        await sendEmail(
          user.email,
          'Subscription Dibatalkan — BabahAlgo',
          `<p>Halo ${user.name || 'Trader'},</p>
           <p>Subscription Anda telah dibatalkan${opts?.tier ? ` (tier: ${opts.tier})` : ''}.</p>
           <p>Alasan: ${reason}</p>
           <p>Eksekusi otomatis sudah berhenti. Untuk aktivasi kembali, <a href="https://babahalgo.com/pricing">pilih paket di /pricing</a>.</p>`,
        );
      } catch (err) {
        log.warn(`Failed to send cancellation email to ${user.email}: ${err}`);
      }
    }
    log.info(`Subscription cancelled user=${userId} source=${source} sub=${result.count} crypto=${cryptoCancelled}`);
  }

  return { subscriptionCancelled: result.count, cryptoCancelled };
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
