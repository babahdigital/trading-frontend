import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createHash } from 'crypto';
import { activateSubscription } from '@/lib/subscription/lifecycle';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('midtrans-webhook');

function verifySignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return false;
  const expected = createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
  return expected === signatureKey;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    order_id,
    transaction_status,
    status_code,
    gross_amount,
    signature_key,
    fraud_status,
  } = body;

  if (!verifySignature(order_id, status_code, gross_amount, signature_key)) {
    log.warn(`Invalid signature for order ${order_id}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: order_id } });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status === 'accept')
  ) {
    await prisma.invoice.update({
      where: { id: order_id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    const tier = (invoice.metadata as Record<string, unknown>)?.tier as string;
    if (tier) {
      await activateSubscription(invoice.userId, tier);
    }

    log.info(`Payment success: ${order_id}`);
  } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
    await prisma.invoice.update({
      where: { id: order_id },
      data: { status: 'CANCELLED' },
    });
    log.info(`Payment ${transaction_status}: ${order_id}`);
  }

  return NextResponse.json({ ok: true });
}
