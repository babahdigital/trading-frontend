import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyRefreshToken, signJwt, signRefreshToken, type JwtPayload } from '@/lib/auth/jwt';
import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/refresh');

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (!refreshToken) {
      return NextResponse.json({ error: 'Refresh token required' }, { status: 400 });
    }

    const decoded = await verifyRefreshToken(refreshToken);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true },
    });

    if (!session || session.revokedAt) {
      return NextResponse.json({ error: 'Session revoked or not found' }, { status: 401 });
    }

    if (session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Session expired' }, { status: 401 });
    }

    const user = session.user;
    const scope = user.role === 'ADMIN' ? ['*'] : ['read:status', 'read:trades', 'read:equity'];

    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as 'ADMIN' | 'CLIENT',
      scope,
    };

    const [newAccessToken, newRefreshToken] = await Promise.all([
      signJwt(payload),
      signRefreshToken(user.id),
    ]);

    // Rotate refresh token
    await prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await prisma.session.create({
      data: {
        userId: user.id,
        jwtId: randomUUID(),
        refreshToken: newRefreshToken,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    log.error('Refresh error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
