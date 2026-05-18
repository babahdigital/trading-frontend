import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AUTH_COOKIE_NAMES, clearAuthCookies } from '@/lib/auth/cookies';
import { forexLogoutSafe } from '@/lib/forex/auth';
import { FOREX_COOKIE_NAMES, clearForexCookies } from '@/lib/forex/cookies';

export async function POST(request: NextRequest) {
  const finalize = (response: NextResponse) =>
    clearForexCookies(clearAuthCookies(response));

  try {
    // Refresh token from cookie (preferred) or legacy body
    let refreshToken = request.cookies.get(AUTH_COOKIE_NAMES.REFRESH_TOKEN)?.value ?? '';
    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      refreshToken = (body as { refreshToken?: string }).refreshToken ?? '';
    }

    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    // Best-effort backend forex revoke — runs even if FE session already
    // expired so the backend refresh chain gets cleaned up.
    const forexAccess = request.cookies.get(FOREX_COOKIE_NAMES.ACCESS)?.value;
    const forexRefresh = request.cookies.get(FOREX_COOKIE_NAMES.REFRESH)?.value;
    if (forexAccess && forexRefresh) {
      await forexLogoutSafe({ accessToken: forexAccess, refreshToken: forexRefresh });
    }

    const userId = request.headers.get('x-user-id');
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'logout',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          metadata: {},
        },
      });
    }

    return finalize(NextResponse.json({ ok: true }));
  } catch {
    return finalize(NextResponse.json({ ok: true }));
  }
}
