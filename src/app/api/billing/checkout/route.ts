import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createMidtransTransaction } from '@/lib/payment/midtrans';
import { createXenditInvoice } from '@/lib/payment/xendit';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TIER_PRICES: Record<string, { amountIdr: number; description: string }> = {
  SIGNAL_BASIC: { amountIdr: 300_000, description: 'Signal Basic - 1 Bulan' },
  SIGNAL_VIP: { amountIdr: 600_000, description: 'Signal VIP - 1 Bulan' },
};

type PaymentProvider = 'midtrans' | 'xendit';

export async function POST(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { tier, provider = 'midtrans' } = body as { tier: string; provider?: PaymentProvider };
  const pricing = TIER_PRICES[tier];
  if (!pricing) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 });

  if (provider !== 'midtrans' && provider !== 'xendit') {
    return NextResponse.json({ error: 'Invalid payment provider. Use "midtrans" or "xendit"' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

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
      metadata: { tier, amountIdr: pricing.amountIdr, provider },
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

  return NextResponse.json({
    orderId,
    provider: 'midtrans',
    snapToken: transaction.token,
    redirectUrl: transaction.redirectUrl,
  });
}
