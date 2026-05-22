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
  const { external_id, status, paid_amount } = body;

  const invoice = await prisma.invoice.findUnique({ where: { id: external_id } });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (status === 'PAID' || status === 'SETTLED') {
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
  } else if (status === 'EXPIRED') {
    await prisma.invoice.update({
      where: { id: external_id },
      data: { status: 'CANCELLED' },
    });

    // Propagate cancellation ke subscription user (backend rc37 sync)
    const tier = (invoice.metadata as Record<string, unknown>)?.tier as string | undefined;
    try {
      await cancelSubscription(invoice.userId, {
        tier,
        reason: 'xendit_expired',
        source: 'xendit',
      });
    } catch (err) {
      log.warn(`Cancel propagation failed for ${external_id}: ${err}`);
    }

    log.info(`Xendit invoice expired: ${external_id}`);
  }

  return NextResponse.json({ ok: true });
}
