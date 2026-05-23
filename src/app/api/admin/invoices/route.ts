export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const log = createLogger('api/admin/invoices');

export async function GET(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search')?.trim();

    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') where.status = status;

    if (search) {
      // Search by invoice number or user email — email requires subquery
      const matchingUsers = await prisma.user.findMany({
        where: { email: { contains: search, mode: 'insensitive' } },
        select: { id: true },
      });
      const userIds = matchingUsers.map((u) => u.id);

      where.OR = [
        { number: { contains: search, mode: 'insensitive' } },
        ...(userIds.length > 0 ? [{ userId: { in: userIds } }] : []),
      ];
    }

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Resolve user info for all invoices
    const userIds = [...new Set(invoices.map((inv) => inv.userId))];
    const users = userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, name: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = invoices.map((inv) => ({
      ...inv,
      amountUsd: Number(inv.amountUsd),
      user: userMap.get(inv.userId) || { id: inv.userId, email: '(deleted)', name: null },
    }));

    return NextResponse.json(enriched);
  } catch (error) {
    log.error('List invoices error:', error);
    return NextResponse.json({ code: 'internal_error', error: 'Internal server error' }, { status: 500 });
  }
}

const patchSchema = z.object({
  id: z.string().min(1, 'Missing invoice id'),
  status: z.enum(['CANCELLED', 'REFUNDED']),
}).strict();

export async function PATCH(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  try {
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json({ code: 'bad_request', error: 'Content-Type must be application/json' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ code: 'bad_request', error: 'Invalid JSON body' }, { status: 400 });
    }

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 'validation_error', error: parsed.error.errors[0].message }, { status: 400 });
    }

    const { id, status } = parsed.data;

    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ code: 'not_found', error: 'Invoice not found' }, { status: 404 });
    }

    const beforeStatus = existing.status;

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'invoice_status_updated',
        metadata: {
          invoiceId: id,
          invoiceNumber: existing.number,
          before: beforeStatus,
          after: status,
        },
      },
    });

    return NextResponse.json({ ...updated, amountUsd: Number(updated.amountUsd) });
  } catch (error) {
    log.error('Update invoice error:', error);
    return NextResponse.json({ code: 'internal_error', error: 'Internal server error' }, { status: 500 });
  }
}
