export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth/require-admin';

const log = createLogger('api/admin/dashboard');

function startOfDayUtc(offsetDays: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
}

/** Returns the daily ACTIVE License count for the last 7 days (oldest first).
 *  Uses createdAt as the "exists since" signal (License rows never delete in
 *  this schema — status transitions to EXPIRED/REVOKED but row stays). */
async function licenseTrend7d(): Promise<number[]> {
  const cutoff = startOfDayUtc(-7);
  const rows = await prisma.license.findMany({
    where: { createdAt: { gte: cutoff } },
    select: { createdAt: true, status: true },
  });
  // Plus the count of pre-existing licenses still active on day 0.
  const base = await prisma.license.count({
    where: { status: 'ACTIVE', createdAt: { lt: cutoff } },
  });
  const buckets: number[] = [];
  for (let i = 7; i >= 1; i--) {
    const dayEnd = startOfDayUtc(-i + 1);
    const cumulative = rows.filter((r) => r.createdAt < dayEnd && r.status === 'ACTIVE').length;
    buckets.push(base + cumulative);
  }
  return buckets;
}

async function userTrend7d(): Promise<number[]> {
  const cutoff = startOfDayUtc(-7);
  const rows = await prisma.user.findMany({
    where: { role: 'CLIENT', createdAt: { gte: cutoff } },
    select: { createdAt: true },
  });
  const base = await prisma.user.count({
    where: { role: 'CLIENT', createdAt: { lt: cutoff } },
  });
  const buckets: number[] = [];
  for (let i = 7; i >= 1; i--) {
    const dayEnd = startOfDayUtc(-i + 1);
    const cumulative = rows.filter((r) => r.createdAt < dayEnd).length;
    buckets.push(base + cumulative);
  }
  return buckets;
}

async function vpsOnlineTrend7d(): Promise<number[]> {
  // VPS online state is point-in-time (no history table). Return the
  // current count flat across 7 days so the sparkline renders without
  // implying false historical variation. The trend pill stays neutral.
  const current = await prisma.vpsInstance.count({ where: { status: 'ONLINE' } });
  return Array(7).fill(current);
}

function trendPct(buckets: number[]): number | null {
  if (buckets.length < 2) return null;
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  if (first === 0) return last === 0 ? 0 : null;
  return Math.round(((last - first) / first) * 1000) / 10; // 1-decimal
}

export async function GET(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;
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
      licenseSpark,
      userSpark,
      vpsSpark,
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
      licenseTrend7d().catch(() => null),
      userTrend7d().catch(() => null),
      vpsOnlineTrend7d().catch(() => null),
    ]);

    return NextResponse.json({
      totalLicenses,
      activeLicenses,
      totalVps,
      onlineVps,
      totalUsers,
      recentKillSwitchEvents,
      expiringIn7Days,
      // 7-day trend arrays (oldest → newest). Null when a query fails.
      trend7d: {
        licenses: licenseSpark,
        users: userSpark,
        vpsOnline: vpsSpark,
      },
      trendPct: {
        licenses: licenseSpark ? trendPct(licenseSpark) : null,
        users: userSpark ? trendPct(userSpark) : null,
        vpsOnline: vpsSpark ? trendPct(vpsSpark) : null,
      },
    });
  } catch (error) {
    log.error('Dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
