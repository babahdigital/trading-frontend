export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/me');
const secret = new TextEncoder().encode(process.env.JWT_SECRET);

/**
 * GET /api/auth/me — Identity probe untuk cookie-based auth.
 *
 * Public-by-design: dipanggil dari EnterpriseNav di semua halaman publik
 * untuk decide tampilan Login/Register vs Portal/Logout. Return 200 dengan
 * `{ user: null }` kalau guest (no cookie / invalid token) supaya tidak
 * clutter console dengan 401. Route ini whitelist di proxy.ts publicPaths,
 * jadi self-handle JWT verify dari cookie.
 *
 * Response shape:
 *   - `{ user: User, activeSubscription: ..., licenseId, subscriptionId }` ketika authenticated
 *   - `{ user: null }` ketika tidak ada session atau token invalid
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  if (!token) {
    return NextResponse.json({ user: null });
  }

  let payload: { sub?: string; role?: string; licenseId?: string; subscriptionId?: string };
  try {
    const verified = await jwtVerify(token, secret);
    payload = verified.payload as typeof payload;
  } catch {
    // Token expired/invalid → treat as guest (frontend can trigger refresh
    // via /api/auth/refresh independently).
    return NextResponse.json({ user: null });
  }

  if (!payload.sub || !payload.role) {
    return NextResponse.json({ user: null });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true, role: true, mt5Account: true, emailVerifiedAt: true },
    });

    if (!user) {
      return NextResponse.json({ user: null });
    }

    const activeSubscription = await prisma.subscription.findFirst({
      where: { userId: payload.sub, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true, tier: true, status: true, expiresAt: true },
    });

    return NextResponse.json({
      user,
      licenseId: payload.licenseId,
      subscriptionId: payload.subscriptionId,
      activeSubscription: activeSubscription
        ? {
            id: activeSubscription.id,
            tier: activeSubscription.tier,
            status: activeSubscription.status,
            expiresAt: activeSubscription.expiresAt.toISOString(),
            autoRenew: false,
            daysRemaining: Math.ceil(
              (activeSubscription.expiresAt.getTime() - Date.now()) / 86400000,
            ),
          }
        : null,
    });
  } catch (error) {
    log.error('Identity probe error:', error);
    return NextResponse.json({ user: null });
  }
}
