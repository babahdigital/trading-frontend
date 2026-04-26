export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { hashPassword } from '@/lib/auth/password';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth/require-admin';

const log = createLogger('api/admin/users');

export async function GET(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, name: true, role: true, mt5Account: true,
          createdAt: true, lastLoginAt: true,
          _count: { select: { licenses: true, subscriptions: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({ users, total, page, limit });
  } catch (error) {
    log.error('List users error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  try {
    const body = await request.json();
    const { email, password, name, role, mt5Account } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: name || null,
        role: role || 'CLIENT',
        mt5Account: mt5Account || null,
      },
      select: { id: true, email: true, name: true, role: true, mt5Account: true, createdAt: true },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'user_created',
        metadata: { newUserId: user.id, email: user.email, role: user.role },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    log.error('Create user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Only allow deleting CLIENT users (safety guard)
    if (existing.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Can only delete CLIENT users' }, { status: 403 });
    }

    // Delete dependent licenses first, then user
    await prisma.license.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'user_deleted',
        metadata: { deletedUserId: id, email: existing.email },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
