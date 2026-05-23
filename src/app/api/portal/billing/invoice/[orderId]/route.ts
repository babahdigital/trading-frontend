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
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const { orderId } = await params;
  if (!orderId || orderId.length < 3) {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_order_id' }, { status: 400 });
  }
  const includeInstrument = request.nextUrl.searchParams.get('include') === 'instrument';

  try {
    const invoice = await prisma.invoice.findFirst({
      where: {
        userId,
        OR: [{ number: orderId }, { id: orderId }],
      },
      select: {
        id: true,
        number: true,
        amountUsd: true,
        status: true,
        paidAt: true,
        description: true,
        metadata: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });
    }

    const meta = (invoice.metadata as Record<string, unknown> | null) ?? {};
    const amountIdr = (meta.amountIdr as number | undefined) ?? 0;
    const instrument = includeInstrument
      ? (meta.instrument as Record<string, unknown> | null) ?? null
      : undefined;

    return NextResponse.json({
      id: invoice.id,
      number: invoice.number,
      amountUsd: Number(invoice.amountUsd),
      amountIdr,
      status: invoice.status,
      paidAt: invoice.paidAt?.toISOString() ?? null,
      description: invoice.description,
      ...(includeInstrument ? { instrument } : {}),
    });
  } catch (err) {
    log.error(`invoice lookup error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'internal_error' }, { status: 500 });
  }
}
