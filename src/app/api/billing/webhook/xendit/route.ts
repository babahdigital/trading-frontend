import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyXenditWebhook } from '@/lib/payment/xendit';
import { activateSubscription } from '@/lib/subscription/lifecycle';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('xendit-webhook');

export async function POST(req: NextRequest) {
  const callbackToken = req.headers.get('x-callback-token') ?? '';
  if (!verifyXenditWebhook(callbackToken)) {
    log.warn('Invalid Xendit callback token');
    return NextResponse.json({ error: 'Invalid callback token' }, { status: 401 });
  }

  const body = await req.json();
  const { external_id, status, paid_amount } = body;

  const invoice = await prisma.invoice.findUnique({ where: { id: external_id } });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (status === 'PAID' || status === 'SETTLED') {
    await prisma.invoice.update({
      where: { id: external_id },
      data: { status: 'PAID', paidAt: new Date() },
    });

    const tier = (invoice.metadata as Record<string, unknown>)?.tier as string;
    if (tier) {
      await activateSubscription(invoice.userId, tier);
    }

    log.info(`Xendit payment success: ${external_id} amount=${paid_amount}`);
  } else if (status === 'EXPIRED') {
    await prisma.invoice.update({
      where: { id: external_id },
      data: { status: 'CANCELLED' },
    });
    log.info(`Xendit invoice expired: ${external_id}`);
  }

  return NextResponse.json({ ok: true });
}
