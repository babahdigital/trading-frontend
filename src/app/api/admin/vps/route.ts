import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { encryptAdminToken } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/vps');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [vpsInstances, total] = await Promise.all([
      prisma.vpsInstance.findMany({
        where,
        select: {
          id: true,
          name: true,
          host: true,
          port: true,
          backendBaseUrl: true,
          status: true,
          lastHealthCheckAt: true,
          lastHealthStatus: true,
          notes: true,
          createdAt: true,
          _count: { select: { licenses: true } },
          healthChecks: {
            orderBy: { checkedAt: 'desc' },
            take: 1,
            select: {
              checkedAt: true,
              httpStatus: true,
              responseTimeMs: true,
              zmqConnected: true,
              dbOk: true,
              lastTickAge: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.vpsInstance.count({ where }),
    ]);

    return NextResponse.json({ vpsInstances, total, page, limit });
  } catch (error) {
    log.error('List VPS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, host, port, backendBaseUrl, adminToken } = body;

    if (!name || !host || !backendBaseUrl || !adminToken) {
      return NextResponse.json(
        { error: 'Missing required fields: name, host, backendBaseUrl, adminToken' },
        { status: 400 }
      );
    }

    const { ciphertext, iv, tag } = encryptAdminToken(adminToken);

    const vpsInstance = await prisma.vpsInstance.create({
      data: {
        name,
        host,
        port: port || 8000,
        backendBaseUrl,
        adminTokenCiphertext: ciphertext,
        adminTokenIv: iv,
        adminTokenTag: tag,
      },
      select: {
        id: true,
        name: true,
        host: true,
        port: true,
        backendBaseUrl: true,
        status: true,
        createdAt: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: request.headers.get('x-user-id'),
        action: 'vps_registered',
        metadata: { vpsInstanceId: vpsInstance.id, name, host },
      },
    });

    return NextResponse.json(vpsInstance, { status: 201 });
  } catch (error) {
    log.error('Register VPS error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
