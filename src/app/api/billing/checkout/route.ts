import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createMidtransTransaction } from '@/lib/payment/midtrans';
import { createXenditInvoice } from '@/lib/payment/xendit';
import { randomUUID } from 'crypto';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Canonical pricing per audit 2026-04-26 (MONETIZATION_STRATEGY.md).
// IDR rates pakai estimasi USD→IDR ~16,500 (revisit saat business confirm).
// SIGNAL_BASIC = legacy alias = same price as SIGNAL_STARTER ($19).
const TIER_PRICES: Record<string, { amountIdr: number; description: string }> = {
  // Forex Signal
  SIGNAL_STARTER: { amountIdr: 315_000, description: 'Signal Starter — 1 Bulan' },
  SIGNAL_BASIC: { amountIdr: 315_000, description: 'Signal Basic (legacy alias Starter) — 1 Bulan' },
  SIGNAL_PRO: { amountIdr: 1_300_000, description: 'Signal Pro — 1 Bulan' },
  SIGNAL_VIP: { amountIdr: 4_950_000, description: 'Signal VIP — 1 Bulan' },
  // Crypto Bot
  CRYPTO_BASIC: { amountIdr: 815_000, description: 'Crypto Basic — 1 Bulan + 20% profit share' },
  CRYPTO_PRO: { amountIdr: 3_300_000, description: 'Crypto Pro — 1 Bulan + 15% profit share' },
  CRYPTO_HNWI: { amountIdr: 8_250_000, description: 'Crypto HNWI — 1 Bulan + 10% profit share' },
  // VPS License
  VPS_STANDARD: { amountIdr: 49_500_000, description: 'VPS License — Setup' },
  VPS_PREMIUM: { amountIdr: 124_000_000, description: 'VPS Premium — Setup' },
  VPS_DEDICATED: { amountIdr: 24_750_000, description: 'VPS Dedicated — 1 Bulan' },
  // Demo (gratis — tidak boleh masuk checkout, return 400)
  DEMO: { amountIdr: 0, description: 'Demo (gratis) — checkout tidak diperlukan' },
};

type PaymentProvider = 'midtrans' | 'xendit';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { key: idempotencyKey, clientSupplied } = resolveIdempotencyKey(req.headers, 'checkout');

  const body = await req.json();
  const { tier, provider = 'midtrans' } = body as { tier: string; provider?: PaymentProvider };
  const pricing = TIER_PRICES[tier];
  if (!pricing) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });
  if (pricing.amountIdr === 0) {
    return NextResponse.json(
      { error: 'free_tier', message: 'Tier gratis tidak butuh checkout. Aktivasi langsung via /demo signup.' },
      { status: 400 },
    );
  }

  if (provider !== 'midtrans' && provider !== 'xendit') {
    return NextResponse.json({ error: 'Invalid payment provider. Use "midtrans" or "xendit"' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Idempotency: if this key already produced an invoice, return existing (no duplicate charge).
  const existing = await prisma.invoice.findFirst({
    where: { userId, metadata: { path: ['idempotencyKey'], equals: idempotencyKey } },
  });
  if (existing) {
    const meta = (existing.metadata ?? {}) as Record<string, unknown>;
    return NextResponse.json({
      orderId: existing.id,
      provider: meta.provider ?? provider,
      replay: true,
      snapToken: meta.snapToken ?? null,
      redirectUrl: meta.redirectUrl ?? null,
      invoiceUrl: meta.invoiceUrl ?? null,
    });
  }

  const orderId = `ORD-${randomUUID().slice(0, 8).toUpperCase()}`;
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.invoice.create({
    data: {
      id: orderId,
      userId,
      number: orderId,
      amountUsd: pricing.amountIdr / 16000,
      status: 'DUE',
      dueAt,
      description: pricing.description,
      subscriptionId: null,
      metadata: { tier, amountIdr: pricing.amountIdr, provider, idempotencyKey, clientSupplied },
    },
  });

  if (provider === 'xendit') {
    const invoice = await createXenditInvoice({
      externalId: orderId,
      amountIdr: pricing.amountIdr,
      customerName: user.name || user.email,
      customerEmail: user.email,
      description: pricing.description,
    });

    await prisma.invoice.update({
      where: { id: orderId },
      data: { metadata: { tier, amountIdr: pricing.amountIdr, provider, idempotencyKey, clientSupplied, invoiceUrl: invoice.invoiceUrl, invoiceId: invoice.invoiceId } },
    });

    return NextResponse.json({
      orderId,
      provider: 'xendit',
      invoiceUrl: invoice.invoiceUrl,
      invoiceId: invoice.invoiceId,
    });
  }

  // Default: Midtrans
  const transaction = await createMidtransTransaction({
    orderId,
    amountIdr: pricing.amountIdr,
    customerName: user.name || user.email,
    customerEmail: user.email,
    itemDescription: pricing.description,
  });

  await prisma.invoice.update({
    where: { id: orderId },
    data: { metadata: { tier, amountIdr: pricing.amountIdr, provider, idempotencyKey, clientSupplied, snapToken: transaction.token, redirectUrl: transaction.redirectUrl } },
  });

  return NextResponse.json({
    orderId,
    provider: 'midtrans',
    snapToken: transaction.token,
    redirectUrl: transaction.redirectUrl,
  });
}
