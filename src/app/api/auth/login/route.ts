import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signJwt, signRefreshToken, type JwtPayload } from '@/lib/auth/jwt';
import { setAuthCookies } from '@/lib/auth/cookies';
import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/auth/login');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, licenseKey, mt5Account } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    let user;

    // Model A login: licenseKey + mt5Account + password
    if (licenseKey) {
      const license = await prisma.license.findUnique({
        where: { licenseKey },
        include: { user: true, vpsInstance: true },
      });

      if (!license || license.status !== 'ACTIVE') {
        return NextResponse.json({ error: 'Invalid or inactive license' }, { status: 401 });
      }

      if (mt5Account && license.user.mt5Account !== mt5Account) {
        return NextResponse.json({ error: 'MT5 account mismatch' }, { status: 401 });
      }

      user = license.user;
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const payload: JwtPayload = {
        sub: user.id,
        role: 'CLIENT',
        licenseId: license.id,
        vpsInstanceId: license.vpsInstanceId ?? undefined,
        scope: ['read:status', 'read:trades', 'read:equity'],
      };

      const [accessToken, refreshToken] = await Promise.all([
        signJwt(payload),
        signRefreshToken(user.id),
      ]);

      const jwtId = randomUUID();
      await prisma.session.create({
        data: {
          userId: user.id,
          jwtId,
          refreshToken,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });

      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          licenseId: license.id,
          action: 'login',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          metadata: { method: 'license_key' },
        },
      });

      return setAuthCookies(
        NextResponse.json({
          user: { id: user.id, email: user.email, role: user.role, name: user.name },
        }),
        { accessToken, refreshToken },
      );
    }

    // Standard login: email + password (Admin or Model B)
    if (!email) {
      return NextResponse.json({ error: 'Email or licenseKey is required' }, { status: 400 });
    }

    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const scope = user.role === 'ADMIN' ? ['*'] : ['read:pamm_stats'];
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as 'ADMIN' | 'CLIENT',
      scope,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signJwt(payload),
      signRefreshToken(user.id),
    ]);

    const jwtId = randomUUID();
    await prisma.session.create({
      data: {
        userId: user.id,
        jwtId,
        refreshToken,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'login',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        metadata: { method: 'email' },
      },
    });

    return setAuthCookies(
      NextResponse.json({
        user: { id: user.id, email: user.email, role: user.role, name: user.name },
      }),
      { accessToken, refreshToken },
    );
  } catch (error) {
    log.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
