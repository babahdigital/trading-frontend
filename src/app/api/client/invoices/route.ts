import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  const token = auth?.replace(/^Bearer\s+/i, '') || req.cookies.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.userId as string) || (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [invoices, subs, licenses] = await Promise.all([
    prisma.invoice.findMany({
      where: { userId },
      orderBy: { issuedAt: 'desc' },
      take: 50,
    }),
    prisma.subscription.findMany({
      where: { userId },
      orderBy: { startsAt: 'desc' },
    }),
    prisma.license.findMany({
      where: { userId },
      select: {
        id: true, licenseKey: true, type: true, status: true,
        startsAt: true, expiresAt: true, autoRenew: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return NextResponse.json({
    invoices: invoices.map((i) => ({
      ...i,
      amountUsd: i.amountUsd.toString(),
    })),
    subscriptions: subs.map((s) => ({
      ...s,
      profitSharePct: s.profitSharePct?.toString() ?? null,
      monthlyFeeUsd: s.monthlyFeeUsd?.toString() ?? null,
    })),
    licenses,
  });
}
