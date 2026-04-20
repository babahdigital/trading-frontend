export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/customers');

/**
 * GET /api/admin/customers — Aggregate customer list with license + VPS info
 *
 * Returns CLIENT users joined with their most recent license and linked VPS,
 * with server-side pagination and filtering.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status'); // ACTIVE | EXPIRED | all
    const search = searchParams.get('search')?.trim();

    const where: Record<string, unknown> = { role: 'CLIENT' };

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
        { mt5Account: { contains: search } },
      ];
    }

    // If filtering by license status, use a subquery approach
    if (status && status !== 'all') {
      if (status === 'no_license') {
        where.licenses = { none: {} };
      } else {
        where.licenses = { some: { status: status.toUpperCase() } };
      }
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          mt5Account: true,
          lastLoginAt: true,
          createdAt: true,
          licenses: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              licenseKey: true,
              status: true,
              type: true,
              expiresAt: true,
              vpsInstance: {
                select: {
                  id: true,
                  name: true,
                  status: true,
                  lastHealthStatus: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    // Flatten: each user gets their most recent license + VPS inline
    const customers = users.map((u) => {
      const license = u.licenses[0] || null;
      return {
        id: u.id,
        email: u.email,
        name: u.name,
        mt5Account: u.mt5Account,
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        license: license
          ? {
              id: license.id,
              licenseKey: license.licenseKey,
              status: license.status,
              type: license.type,
              expiresAt: license.expiresAt,
            }
          : null,
        vps: license?.vpsInstance
          ? {
              id: license.vpsInstance.id,
              name: license.vpsInstance.name,
              status: license.vpsInstance.status,
              healthStatus: license.vpsInstance.lastHealthStatus,
            }
          : null,
      };
    });

    return NextResponse.json({ customers, total, page, limit });
  } catch (error) {
    log.error('List customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
