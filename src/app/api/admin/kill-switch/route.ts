import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { Prisma } from '@prisma/client';
import { proxyToVpsBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/kill-switch');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const [events, total] = await Promise.all([
      prisma.killSwitchEvent.findMany({
        include: {
          license: {
            select: {
              id: true,
              licenseKey: true,
              type: true,
              userId: true,
              vpsInstanceId: true,
            },
          },
        },
        orderBy: { triggeredAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.killSwitchEvent.count(),
    ]);

    return NextResponse.json({ events, total, page, limit });
  } catch (error) {
    log.error('List kill switch events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const body = await request.json();
    const { licenseId } = body;

    if (!licenseId) {
      return NextResponse.json({ error: 'licenseId is required' }, { status: 400 });
    }

    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      include: { vpsInstance: true },
    });

    if (!license) {
      return NextResponse.json({ error: 'License not found' }, { status: 404 });
    }

    if (!license.vpsInstanceId) {
      return NextResponse.json(
        { error: 'License has no associated VPS instance' },
        { status: 400 }
      );
    }

    let apiResponse: Record<string, unknown> = {};
    let success = false;
    let errorMessage: string | null = null;

    try {
      const response = await proxyToVpsBackend(
        license.vpsInstanceId,
        '/api/scalping/stop',
        { method: 'POST' }
      );
      apiResponse = await response.json();
      success = response.ok;
    } catch (proxyError) {
      errorMessage =
        proxyError instanceof Error ? proxyError.message : 'Proxy request failed';
    }

    const event = await prisma.killSwitchEvent.create({
      data: {
        licenseId,
        triggeredBy: userId || 'system',
        apiResponse: apiResponse as Prisma.InputJsonValue,
        success,
        errorMessage,
      },
    });

    await prisma.license.update({
      where: { id: licenseId },
      data: { status: 'SUSPENDED' },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        licenseId,
        action: 'kill_switch_triggered',
        metadata: { success, eventId: event.id } as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({
      event,
      success,
      message: success
        ? 'Kill switch triggered successfully'
        : 'Kill switch recorded but proxy request failed',
    });
  } catch (error) {
    log.error('Kill switch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
