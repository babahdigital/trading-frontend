/**
 * Customer-facing invoice status lookup.
 *
 * 2026-05-20 — Phase A polish. Success page poll endpoint untuk realtime
 * confirm payment status setelah Midtrans/Xendit webhook update.
 *
 * Auth: customer must be logged in via portal session JWT (middleware
 * enforces /api/portal/* requires CLIENT role). Cuma return invoice
 * belonging to authenticated user — no cross-tenant leak.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/portal/billing/invoice');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> },
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId || orderId.length < 3) {
    return NextResponse.json({ error: 'invalid_order_id' }, { status: 400 });
  }

  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        userId,
        OR: [{ number: orderId }, { id: orderId }],
      },
      select: {
        number: true,
        amountUsd: true,
        status: true,
        paidAt: true,
        description: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json({
      number: invoice.number,
      amountUsd: Number(invoice.amountUsd),
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      description: invoice.description,
    });
  } catch (err) {
    log.error(`invoice lookup error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
