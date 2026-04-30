export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { SubscriberStatus, SubscriberSource, Prisma } from '@prisma/client';

const VALID_STATUSES: SubscriberStatus[] = ['ACTIVE', 'UNSUBSCRIBED', 'BOUNCED'];
const VALID_SOURCES: SubscriberSource[] = [
  'FOOTER', 'CHAT_LEAD', 'CONTACT_FORM', 'RESEARCH_INLINE', 'EXIT_INTENT', 'IMPORT',
];

function csvEscape(v: string | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const source = searchParams.get('source');
  const search = searchParams.get('q')?.trim();
  const format = searchParams.get('format'); // 'csv' supports export
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(format === 'csv' ? 5000 : 100, parseInt(searchParams.get('limit') || '50', 10));

  const where: Prisma.SubscriberWhereInput = {};
  if (status && VALID_STATUSES.includes(status as SubscriberStatus)) {
    where.status = status as SubscriberStatus;
  }
  if (source && VALID_SOURCES.includes(source as SubscriberSource)) {
    where.source = source as SubscriberSource;
  }
  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' } },
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  // CSV export — bypass pagination, stream as file
  if (format === 'csv') {
    const rows = await prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    const header = 'email,name,phone,locale,source,status,createdAt,lastSentAt';
    const body = rows
      .map((r) =>
        [
          csvEscape(r.email),
          csvEscape(r.name),
          csvEscape(r.phone),
          csvEscape(r.locale),
          csvEscape(r.source),
          csvEscape(r.status),
          csvEscape(r.createdAt.toISOString()),
          csvEscape(r.lastSentAt?.toISOString() ?? ''),
        ].join(','),
      )
      .join('\n');
    return new NextResponse(`${header}\n${body}\n`, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  const [subscribers, total, byStatus, bySource] = await Promise.all([
    prisma.subscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.subscriber.count({ where }),
    prisma.subscriber.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.subscriber.groupBy({
      by: ['source'],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    subscribers,
    total,
    page,
    limit,
    counts: {
      byStatus: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
      bySource: Object.fromEntries(bySource.map((b) => [b.source, b._count._all])),
    },
  });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { id, status } = body as { id?: string; status?: string };
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  if (status && !VALID_STATUSES.includes(status as SubscriberStatus)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const updated = await prisma.subscriber.update({
    where: { id },
    data: {
      ...(status ? { status: status as SubscriberStatus } : {}),
    },
  });
  return NextResponse.json(updated);
}
