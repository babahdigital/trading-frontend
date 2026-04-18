export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { searchParams } = request.nextUrl;
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const where = status ? { status: status as 'NEW' | 'CONTACTED' | 'IN_PROGRESS' | 'CLOSED' | 'REJECTED' } : {};

  const [inquiries, total] = await Promise.all([
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.inquiry.count({ where }),
  ]);

  return NextResponse.json({ inquiries, total, page, limit });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, status, notes } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: { ...(status && { status }), ...(notes !== undefined && { notes }) },
  });
  return NextResponse.json(inquiry);
}
