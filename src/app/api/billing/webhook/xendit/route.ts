import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyXenditWebhook } from '@/lib/payment/xendit';
import { activateSubscription, cancelSubscription } from '@/lib/subscription/lifecycle';
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
