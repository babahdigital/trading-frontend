import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const pair = url.searchParams.get('pair');
  const outcome = url.searchParams.get('outcome');
  const minConf = url.searchParams.get('min_confidence');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200);
  const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

  const where: Record<string, unknown> = {};
  if (pair) where.pair = pair;
  if (outcome) where.outcome = outcome;
  if (minConf) where.confidence = { gte: minConf };

  const [items, total] = await Promise.all([
    prisma.signalAuditLog.findMany({
      where,
      orderBy: { emittedAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        sourceId: true,
        pair: true,
        direction: true,
        entryType: true,
        lot: true,
        entryPrice: true,
        stopLoss: true,
        takeProfit: true,
        confidence: true,
        reasoning: true,
        outcome: true,
        closePrice: true,
        closeReason: true,
        profitUsd: true,
        emittedAt: true,
        closedAt: true,
      },
    }),
    prisma.signalAuditLog.count({ where }),
  ]);

  const serialized = items.map((i) => ({
    ...i,
    sourceId: i.sourceId.toString(),
  }));

  return NextResponse.json({ items: serialized, total, limit, offset });
}
