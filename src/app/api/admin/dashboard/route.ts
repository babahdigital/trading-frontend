import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/dashboard');

export async function GET(request: NextRequest) {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [
      totalLicenses,
      activeLicenses,
      totalVps,
      onlineVps,
      totalUsers,
      recentKillSwitchEvents,
      expiringIn7Days,
    ] = await Promise.all([
      prisma.license.count(),
      prisma.license.count({ where: { status: 'ACTIVE' } }),
      prisma.vpsInstance.count(),
      prisma.vpsInstance.count({ where: { status: 'ONLINE' } }),
      prisma.user.count({ where: { role: 'CLIENT' } }),
      prisma.killSwitchEvent.count({ where: { triggeredAt: { gte: thirtyDaysAgo } } }),
      prisma.license.count({
        where: {
          status: 'ACTIVE',
          expiresAt: { lte: sevenDaysFromNow, gte: now },
        },
      }),
    ]);

    return NextResponse.json({
      totalLicenses,
      activeLicenses,
      totalVps,
      onlineVps,
      totalUsers,
      recentKillSwitchEvents,
      expiringIn7Days,
    });
  } catch (error) {
    log.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
