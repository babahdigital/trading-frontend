import { prisma } from '@/lib/db/prisma';
import { sendEmail } from '@/lib/notifier/email';
import { addMonths } from 'date-fns';
import { createLogger } from '@/lib/logger';
import { renderEmailShell } from '@/lib/email/shell';

const log = createLogger('subscription');

type EmailLocale = 'id' | 'en';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://babahalgo.com';

/** Resolve locale untuk transactional email — prioritas:
 *  1. Explicit `locale` arg (dari webhook handler reading invoice.metadata)
 *  2. Most recent ChatLead untuk user.email (locale field exists di ChatLead)
 *  3. Default 'id' (primary market) */
async function resolveEmailLocale(userEmail: string, explicit?: string): Promise<EmailLocale> {
  if (explicit === 'en' || explicit === 'id') return explicit;
  try {
    const lead = await prisma.chatLead.findFirst({
      where: { email: userEmail },
      orderBy: { createdAt: 'desc' },
      select: { locale: true },
    });
    if (lead?.locale === 'en') return 'en';
  } catch { /* ignore */ }
  return 'id';
}

export async function activateSubscription(
  userId: string,
  tier: string,
  opts?: { invoiceId?: string; invoiceUrl?: string; locale?: 'id' | 'en' },
) {
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
    const locale = await resolveEmailLocale(user.email, opts?.locale);
    const isEn = locale === 'en';
    const greetName = user.name || (isEn ? 'Trader' : 'Trader');
    const expiresStr = expiresAt.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const portalUrl = `${APP_URL}/portal/account/notifications`;
    const billingUrl = `${APP_URL}/portal/billing`;
    const invoiceLink = opts?.invoiceUrl
      ? `<p style="margin: 0 0 12px 0; font-size: 13px;">📄 ${isEn ? 'Invoice PDF' : 'Invoice PDF'}: <a href="${opts.invoiceUrl}" style="color: #F5B547; text-decoration: none;">${isEn ? 'Download' : 'Unduh'} →</a></p>`
      : opts?.invoiceId
        ? `<p style="margin: 0 0 12px 0; font-size: 13px;">${isEn ? 'Invoice' : 'Invoice'}: <strong style="color: #FAFAF7;">${opts.invoiceId}</strong> — <a href="${billingUrl}" style="color: #F5B547; text-decoration: none;">${isEn ? 'view in portal' : 'lihat di portal'} →</a></p>`
        : '';

    const subject = isEn
      ? `Subscription Active — BabahAlgo`
      : `Subscription Aktif — BabahAlgo`;

    const bodyHtml = isEn
      ? `
        <p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">Hi ${greetName},</strong></p>
        <p style="margin: 0 0 18px 0;">Your <strong style="color: #F5B547;">${tier}</strong> subscription is now active until <strong>${expiresStr}</strong>.</p>
        <div style="margin: 18px 0; padding: 16px; background: rgba(245,181,71,0.06); border-left: 3px solid #F5B547; border-radius: 0 8px 8px 0;">
          ${invoiceLink}
          <p style="margin: 4px 0 0 0; font-size: 13px;">⚙️ ${isEn ? 'Configure notifications' : 'Atur notifikasi'}: <a href="${portalUrl}" style="color: #F5B547; text-decoration: none;">Portal Settings →</a></p>
        </div>`
      : `
        <p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">Halo ${greetName},</strong></p>
        <p style="margin: 0 0 18px 0;">Subscription <strong style="color: #F5B547;">${tier}</strong> Anda sudah aktif hingga <strong>${expiresStr}</strong>.</p>
        <div style="margin: 18px 0; padding: 16px; background: rgba(245,181,71,0.06); border-left: 3px solid #F5B547; border-radius: 0 8px 8px 0;">
          ${invoiceLink}
          <p style="margin: 4px 0 0 0; font-size: 13px;">⚙️ Atur notifikasi: <a href="${portalUrl}" style="color: #F5B547; text-decoration: none;">Portal Settings →</a></p>
        </div>`;

    const html = renderEmailShell({
      locale,
      subject,
      eyebrow: isEn ? 'Subscription Active' : 'Subscription Aktif',
      title: isEn ? `${tier} is live` : `${tier} sudah aktif`,
      bodyHtml,
      cta: { label: isEn ? 'Open Portal' : 'Buka Portal', href: `${APP_URL}/portal` },
    });

    try {
      await sendEmail(user.email, subject, html);
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
      const locale = await resolveEmailLocale(user.email);
      const isEn = locale === 'en';
      const subject = isEn ? 'Subscription Cancelled — BabahAlgo' : 'Subscription Dibatalkan — BabahAlgo';
      const greetName = user.name || (isEn ? 'Trader' : 'Trader');
      const tierLine = opts?.tier ? ` (${opts.tier})` : '';
      const bodyHtml = isEn
        ? `
          <p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">Hi ${greetName},</strong></p>
          <p style="margin: 0 0 18px 0;">Your subscription${tierLine} has been cancelled. Automated execution has stopped.</p>
          <div style="margin: 18px 0; padding: 14px 18px; background: rgba(255,255,255,0.04); border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: rgba(250,250,247,0.75);"><strong>Reason:</strong> ${reason}</p>
          </div>`
        : `
          <p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">Halo ${greetName},</strong></p>
          <p style="margin: 0 0 18px 0;">Subscription${tierLine} Anda telah dibatalkan. Eksekusi otomatis sudah berhenti.</p>
          <div style="margin: 18px 0; padding: 14px 18px; background: rgba(255,255,255,0.04); border-radius: 8px;">
            <p style="margin: 0; font-size: 13px; color: rgba(250,250,247,0.75);"><strong>Alasan:</strong> ${reason}</p>
          </div>`;
      const html = renderEmailShell({
        locale,
        subject,
        eyebrow: isEn ? 'Subscription Cancelled' : 'Subscription Dibatalkan',
        title: isEn ? 'Subscription cancelled' : 'Subscription dibatalkan',
        bodyHtml,
        cta: { label: isEn ? 'Reactivate' : 'Aktifkan Kembali', href: `${APP_URL}/pricing` },
      });
      try {
        await sendEmail(user.email, subject, html);
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
    const locale = await resolveEmailLocale(sub.user.email);
    const isEn = locale === 'en';
    const expiresStr = sub.expiresAt.toLocaleDateString(isEn ? 'en-US' : 'id-ID', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const subject = isEn
      ? 'Subscription expiring in 3 days — BabahAlgo'
      : 'Subscription Akan Berakhir — 3 Hari Lagi';
    const greetName = sub.user.name || (isEn ? 'Trader' : 'Trader');
    const bodyHtml = isEn
      ? `
        <p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">Hi ${greetName},</strong></p>
        <p style="margin: 0 0 18px 0;">Your <strong style="color: #F5B547;">${sub.tier}</strong> subscription expires on <strong>${expiresStr}</strong>. Renew to keep automated execution running without interruption.</p>`
      : `
        <p style="margin: 0 0 14px 0;"><strong style="color: #FAFAF7;">Halo ${greetName},</strong></p>
        <p style="margin: 0 0 18px 0;">Subscription <strong style="color: #F5B547;">${sub.tier}</strong> Anda berakhir <strong>${expiresStr}</strong>. Perpanjang untuk lanjutkan eksekusi otomatis tanpa terputus.</p>`;
    const html = renderEmailShell({
      locale,
      subject,
      eyebrow: isEn ? 'Renewal Reminder' : 'Pengingat Perpanjangan',
      title: isEn ? 'Expires in 3 days' : 'Berakhir dalam 3 hari',
      bodyHtml,
      cta: { label: isEn ? 'Renew Now' : 'Perpanjang Sekarang', href: `${APP_URL}/portal/billing` },
    });
    try {
      await sendEmail(sub.user.email, subject, html);
    } catch (err) {
      log.warn(`Failed to send renewal reminder to ${sub.user.email}: ${err}`);
    }
  }
}
