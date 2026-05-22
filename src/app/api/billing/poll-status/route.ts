/**
 * Poll inline charge status — dipakai FE untuk loop polling QRIS/VA
 * sampai status berubah (SUCCEEDED / FAILED / EXPIRED).
 *
 * Strategy: cek DB Invoice.status DULU (webhook update lebih cepat
 * daripada Xendit polling). Kalau invoice masih DUE, FALLBACK polling
 * langsung ke Xendit API supaya FE tetap responsive walau webhook lag.
 *
 * Rate limit: client polling tiap 3s tipikal. Per-user limit di
 * middleware sudah cover; tidak perlu rate limit khusus di sini.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getXenditChargeStatus, type XenditPaymentMethod } from '@/lib/payment/xendit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const userId = req.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const orderId = url.searchParams.get('orderId');
  if (!orderId) {
    return NextResponse.json({ code: 'missing_orderId', error: 'Missing orderId' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: orderId, userId },
    select: { id: true, status: true, paidAt: true, metadata: true },
  });
  if (!invoice) {
    return NextResponse.json({ code: 'not_found', error: 'Invoice not found' }, { status: 404 });
  }

  // Fast path — webhook already updated invoice ke PAID/CANCELED
  if (invoice.status === 'PAID') {
    return NextResponse.json({ status: 'SUCCEEDED', paidAt: invoice.paidAt });
  }
  if (invoice.status === 'CANCELLED') {
    return NextResponse.json({ status: 'FAILED' });
  }
  if (invoice.status === 'OVERDUE') {
    return NextResponse.json({ status: 'EXPIRED' });
  }

  // Slow path — query Xendit directly (webhook might lag a few seconds)
  const meta = (invoice.metadata as Record<string, unknown> | null) ?? {};
  const instrument = (meta.instrument as {
    id?: string; method?: XenditPaymentMethod;
  } | null) ?? null;

  if (!instrument?.id || !instrument?.method) {
    return NextResponse.json({ status: 'PENDING' });
  }

  try {
    const upstream = await getXenditChargeStatus(instrument.method, instrument.id);
    return NextResponse.json({ status: upstream });
  } catch {
    // Gateway hiccup — return PENDING and let FE keep polling
    return NextResponse.json({ status: 'PENDING' });
  }
}
