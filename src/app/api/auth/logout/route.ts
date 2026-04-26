import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { AUTH_COOKIE_NAMES, clearAuthCookies } from '@/lib/auth/cookies';

export async function POST(request: NextRequest) {
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

    return clearAuthCookies(NextResponse.json({ ok: true }));
  } catch {
    return clearAuthCookies(NextResponse.json({ ok: true }));
  }
}
