export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/me');

/**
 * GET /api/auth/me — Identity probe for cookie-based auth.
 *
 * Middleware already verifies the access_token cookie and forwards user
 * context via `x-user-id` / `x-user-role` headers. This endpoint just
 * surfaces the same info to the client without exposing the raw JWT —
 * needed because HttpOnly cookies are invisible to client JS.
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');
    const licenseId = request.headers.get('x-license-id') || undefined;
    const subscriptionId = request.headers.get('x-subscription-id') || undefined;

    if (!userId || !role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true, mt5Account: true, emailVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Active subscription (latest by createdAt) — untuk surface expiry
    // banner di portal supaya customer dapat warn sebelum auto-suspend.
    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tier: true, status: true, expiresAt: true },
    });

    return NextResponse.json({
      user,
      licenseId,
      subscriptionId,
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            tier: activeSubscription.tier,
            status: activeSubscription.status,
            expiresAt: activeSubscription.expiresAt.toISOString(),
            // Subscription model belum punya autoRenew (License punya untuk VPS).
            // Future: tambah saat billing recurring di-implement. Default false.
            autoRenew: false,
            daysRemaining: Math.ceil(
              (activeSubscription.expiresAt.getTime() - Date.now()) / 86400000,
            ),
          }
        : null,
    });
  } catch (error) {
    log.error('Identity probe error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
