export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { randomBytes } from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/licenses');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const [licenses, total] = await Promise.all([
      prisma.license.findMany({
        where,
        include: { user: { select: { id: true, email: true, name: true } }, vpsInstance: { select: { id: true, name: true, status: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.license.count({ where }),
    ]);

    return NextResponse.json({ licenses, total, page, limit });
  } catch (error) {
    log.error('List licenses error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateLicenseKey(): string {
  const segments = Array.from({ length: 4 }, () =>
    randomBytes(2).toString('hex').toUpperCase()
  );
  return `TRAD-${segments.join('-')}`;
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, vpsInstanceId, status, expiresAt, autoRenew } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing license id' }, { status: 400 });
    }

    const existing = await prisma.license.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (vpsInstanceId !== undefined) data.vpsInstanceId = vpsInstanceId;
    if (status !== undefined) data.status = status;
    if (expiresAt !== undefined) data.expiresAt = new Date(expiresAt);
    if (autoRenew !== undefined) data.autoRenew = autoRenew;

    const updated = await prisma.license.update({
      where: { id },
      data,
      include: { user: { select: { id: true, email: true, name: true } }, vpsInstance: { select: { id: true, name: true, status: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        licenseId: id,
        action: 'license_updated',
        metadata: { vpsInstanceId, status, expiresAt, autoRenew },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    log.error('Update license error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, vpsInstanceId, startsAt, expiresAt, autoRenew, metadata } = body;

    if (!userId || !type || !startsAt || !expiresAt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const license = await prisma.license.create({
      data: {
        userId,
        licenseKey: generateLicenseKey(),
        type,
        vpsInstanceId: vpsInstanceId || null,
        status: 'ACTIVE',
        startsAt: new Date(startsAt),
        expiresAt: new Date(expiresAt),
        autoRenew: autoRenew || false,
        metadata: metadata || {},
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        licenseId: license.id,
        action: 'license_created',
        metadata: { type, userId: license.userId },
      },
    });

    return NextResponse.json(license, { status: 201 });
  } catch (error) {
    log.error('Create license error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
