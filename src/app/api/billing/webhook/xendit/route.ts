import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyXenditWebhook } from '@/lib/payment/xendit';
import { activateSubscription, cancelSubscription } from '@/lib/subscription/lifecycle';
import { generateInvoicePdf } from '@/lib/payment/pdf-invoice';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('xendit-webhook');

export async function POST(req: NextRequest) {
  const callbackToken = req.headers.get('x-callback-token') ?? '';
  if (!verifyXenditWebhook(callbackToken)) {
    // Diagnostic without exposing secrets: log length + last-4-chars only
    const envToken = process.env.XENDIT_WEBHOOK_TOKEN ?? '';
    log.warn(
      `Invalid Xendit callback token — got_len=${callbackToken.length} got_suffix=...${callbackToken.slice(-4)} `
      + `env_set=${envToken.length > 0} env_len=${envToken.length} env_suffix=...${envToken.slice(-4)}`,
    );
    return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 });
  }

  const body = await req.json();

  // Xendit webhook payload shape varies per API:
  //   - Invoice API:  { external_id, status: 'PAID'|'EXPIRED', paid_amount }
  //   - QR Code API:  { reference_id, status: 'COMPLETED'|'ACTIVE'|'INACTIVE', amount }
  //   - VA API:       { external_id, payment_id, transaction_timestamp, amount }
  //   - Card API:     { external_id, status: 'CAPTURED'|'FAILED', amount }
  //
  // We normalize ke external_id + status logical (PAID / EXPIRED / FAILED).
  const external_id: string = body.external_id ?? body.reference_id;
  const rawStatus: string = body.status ?? (body.event ? String(body.event) : '');
  const paid_amount: number | undefined = body.paid_amount ?? body.amount;

  // Map Xendit status string → logical status
  const upper = rawStatus.toUpperCase();
  let logicalStatus: 'PAID' | 'EXPIRED' | 'FAILED' | null = null;
  if (upper === 'PAID' || upper === 'SETTLED' || upper === 'COMPLETED'
      || upper === 'CAPTURED' || upper === 'SUCCEEDED'
      || upper.includes('PAYMENT_MADE') || upper.includes('CAPTURED')
      || upper.includes('PAYMENT.SUCCEEDED')) {
    logicalStatus = 'PAID';
  } else if (upper === 'EXPIRED' || upper.includes('EXPIRED')) {
    logicalStatus = 'EXPIRED';
  } else if (upper === 'FAILED' || upper === 'DECLINED' || upper.includes('FAILED')) {
    logicalStatus = 'FAILED';
  }

  if (!external_id) {
    log.warn(`Webhook missing external_id/reference_id: ${JSON.stringify(body).slice(0, 200)}`);
    return NextResponse.json({ ok: true, ignored: 'missing_external_id' });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: external_id } });
  if (!invoice) {
    log.warn(`Webhook received for unknown invoice: ${external_id} (status=${rawStatus})`);
    // ACK to prevent infinite retry from Xendit side. Likely test ping or stale.
    return NextResponse.json({ ok: true, ignored: 'invoice_not_found' });
  }

  // Idempotency — if already PAID, ignore duplicate webhook (Xendit retries)
  if (invoice.status === 'PAID' && logicalStatus === 'PAID') {
    log.info(`Webhook ignored (already PAID): ${external_id}`);
    return NextResponse.json({ ok: true, ignored: 'already_paid' });
  }

  if (logicalStatus === 'PAID') {
    const paidAt = new Date();
    await prisma.invoice.update({
      where: { id: external_id },
      data: { status: 'PAID', paidAt },
    });

    const meta = (invoice.metadata as Record<string, unknown>) ?? {};
    const tier = meta.tier as string;
    const invoiceUrl = meta.invoiceUrl as string | undefined;
    const invoiceId = (meta.invoiceId as string | undefined) ?? invoice.id;
    const amountIdr = (meta.amountIdr as number | undefined) ?? Number(invoice.amountUsd) * 16500;
    const originalAmountIdr = meta.originalAmountIdr as number | undefined;
    const promoApplied = meta.promoApplied as { slug: string; discountValue: number; discountType: 'PERCENT' | 'FIXED_IDR' } | null | undefined;
    // Locale stored di metadata saat checkout (detectRequestLocale di checkout/route.ts)
    // — fallback ke ChatLead lookup di lifecycle kalau tidak ada.
    const localeMeta = meta.locale as string | undefined;
    const locale: 'id' | 'en' | undefined = localeMeta === 'en' ? 'en' : localeMeta === 'id' ? 'id' : undefined;
    // Inline checkout (2026-05-22): user pilih method di domain kita,
    // kita simpan di metadata.paymentMethod. Mapping ke friendly label
    // untuk display di PDF invoice.
    const PAYMENT_METHOD_LABELS: Record<string, string> = {
      CREDIT_CARD: 'Credit / Debit Card',
      QRIS: 'QRIS',
      BCA: 'BCA Virtual Account', BNI: 'BNI Virtual Account', BRI: 'BRI Virtual Account',
      MANDIRI: 'Mandiri Virtual Account', BSI: 'BSI Virtual Account', PERMATA: 'Permata Virtual Account',
      OVO: 'OVO', DANA: 'DANA', SHOPEEPAY: 'ShopeePay', LINKAJA: 'LinkAja',
      ALFAMART: 'Alfamart', INDOMARET: 'Indomaret',
    };
    const paymentMethodCode = meta.paymentMethod as string | undefined;
    // Xendit webhook payload juga punya payment_method/channel — fallback
    // ke situ kalau metadata.paymentMethod tidak ter-set (legacy invoice).
    const webhookMethod = typeof body.payment_method === 'string' ? body.payment_method : undefined;
    const webhookChannel = typeof body.payment_channel === 'string' ? body.payment_channel : undefined;
    const paymentMethodLabel = paymentMethodCode
      ? (PAYMENT_METHOD_LABELS[paymentMethodCode] ?? paymentMethodCode)
      : (webhookChannel && PAYMENT_METHOD_LABELS[webhookChannel])
        ? PAYMENT_METHOD_LABELS[webhookChannel]
        : webhookMethod ?? undefined;

    // Generate PDF invoice — best-effort, never block activation.
    let pdfUrl: string | undefined;
    try {
      const user = await prisma.user.findUnique({ where: { id: invoice.userId } });
      if (user) {
        const pdf = await generateInvoicePdf({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          issuedAt: invoice.createdAt,
          paidAt,
          dueAt: invoice.dueAt,
          customer: { name: user.name || user.email, email: user.email },
          amountIdr,
          originalAmountIdr,
          description: invoice.description || `${tier} subscription`,
          tier,
          provider: 'xendit',
          promo: promoApplied ?? null,
          locale: locale ?? (user.locale === 'en' ? 'en' : 'id'),
          paymentMethodLabel,
        });
        pdfUrl = pdf.pdfUrl;
        // Persist pdfUrl ke invoice.metadata supaya portal billing page bisa link
        await prisma.invoice.update({
          where: { id: external_id },
          data: { metadata: { ...meta, pdfUrl } },
        });
      }
    } catch (err) {
      log.warn(`PDF invoice generation failed for ${external_id}: ${err instanceof Error ? err.message : 'unknown'}`);
    }

    if (tier) {
      await activateSubscription(invoice.userId, tier, {
        invoiceId,
        invoiceUrl: pdfUrl ?? invoiceUrl, // prefer PDF link kalau ada
        locale,
      });
    }

    log.info(`Xendit payment success: ${external_id} amount=${paid_amount} pdf=${pdfUrl ?? 'none'}`);
  } else if (logicalStatus === 'EXPIRED' || logicalStatus === 'FAILED') {
    await prisma.invoice.update({
      where: { id: external_id },
      data: { status: 'CANCELLED' },
    });

    // Propagate cancellation ke subscription user (backend rc37 sync)
    const tier = (invoice.metadata as Record<string, unknown>)?.tier as string | undefined;
    try {
      await cancelSubscription(invoice.userId, {
        tier,
        reason: logicalStatus === 'EXPIRED' ? 'xendit_expired' : 'xendit_failed',
        source: 'xendit',
      });
    } catch (err) {
      log.warn(`Cancel propagation failed for ${external_id}: ${err}`);
    }

    log.info(`Xendit invoice ${logicalStatus}: ${external_id}`);
  } else {
    // Unknown/intermediate event — ACK without action.
    log.info(`Xendit webhook unknown status: ${external_id} status=${rawStatus}`);
  }

  return NextResponse.json({ ok: true });
}
