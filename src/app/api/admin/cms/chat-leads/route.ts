export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { ChatLeadStatus, Prisma } from '@prisma/client';

const VALID_STATUSES: ChatLeadStatus[] = ['NEW', 'CONVERTED', 'CONTACTED', 'ARCHIVED'];

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const consent = searchParams.get('consent');
  const search = searchParams.get('q')?.trim();
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
  const limit = Math.min(100, parseInt(searchParams.get('limit') || '50', 10));

  const where: Prisma.ChatLeadWhereInput = {};
  if (status && VALID_STATUSES.includes(status as ChatLeadStatus)) {
    where.status = status as ChatLeadStatus;
  }
  if (consent === 'true') where.consentMarketing = true;
  if (consent === 'false') where.consentMarketing = false;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ];
  }

  const [leads, total, byStatus] = await Promise.all([
    prisma.chatLead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.chatLead.count({ where }),
    prisma.chatLead.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ]);

  return NextResponse.json({
    leads,
    total,
    page,
    limit,
    counts: Object.fromEntries(byStatus.map((b) => [b.status, b._count._all])),
  });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const { id, status, notes } = body as { id?: string; status?: string; notes?: string };
  if (!id) return NextResponse.json({ error: 'id_required' }, { status: 400 });
  if (status && !VALID_STATUSES.includes(status as ChatLeadStatus)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  }

  const updated = await prisma.chatLead.update({
    where: { id },
    data: {
      ...(status ? { status: status as ChatLeadStatus } : {}),
      ...(notes !== undefined ? { notes } : {}),
    },
  });
  return NextResponse.json(updated);
}
