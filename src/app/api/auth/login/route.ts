import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyPassword } from '@/lib/auth/password';
import { signJwt, signRefreshToken, isAdminRole, type JwtPayload } from '@/lib/auth/jwt';
import { setAuthCookies, setLocaleCookie } from '@/lib/auth/cookies';
import { forexLogin } from '@/lib/forex/auth';
import { setForexCookies } from '@/lib/forex/cookies';
import { ForexApiError } from '@/lib/forex/types';
import { randomUUID } from 'crypto';
import { createLogger } from '@/lib/logger';
import { verifyTotp } from '@/lib/auth/totp';
import { checkRateLimit, rateLimitedResponse, RATE_LIMITS } from '@/lib/api/rate-limiter';

const log = createLogger('api/auth/login');

// Error response helper — returns both `code` (stable, locale-agnostic for
// frontend lookup in errors.auth.* namespace) and `error` (English string
// for non-i18n consumers / logs / curl).
function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ code, error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const rl = checkRateLimit(ip, RATE_LIMITS.AUTH_LOGIN);
    if (!rl.allowed) return rateLimitedResponse(rl);

    const body = await request.json();
    const { email, password, licenseKey, mt5Account } = body;

    if (!password) {
      return errorResponse('password_required', 'Password is required', 400);
    }

    let user;

    // Model A login: licenseKey + mt5Account + password
    if (licenseKey) {
      const license = await prisma.license.findUnique({
        where: { licenseKey },
        include: { user: true, vpsInstance: true },
      });

      if (!license || license.status !== 'ACTIVE') {
        return errorResponse('invalid_license', 'Invalid or inactive license', 401);
      }

      if (mt5Account && license.user.mt5Account !== mt5Account) {
        return errorResponse('mt5_account_mismatch', 'MT5 account mismatch', 401);
      }

      user = license.user;
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        return errorResponse('invalid_credentials', 'Invalid credentials', 401);
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

      return setLocaleCookie(
        setAuthCookies(
          NextResponse.json({
            user: { id: user.id, email: user.email, role: user.role, name: user.name, locale: user.locale },
          }),
          { accessToken, refreshToken },
        ),
        user.locale,
      );
    }

    // Standard login: email + password (Admin or Model B)
    if (!email) {
      return errorResponse('email_required', 'Email or licenseKey is required', 400);
    }

    user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return errorResponse('invalid_credentials', 'Invalid credentials', 401);
    }

    if (!user.isActive) {
      return errorResponse('account_disabled', 'Account is disabled', 403);
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return errorResponse('invalid_credentials', 'Invalid credentials', 401);
    }

    // 2FA gate: if enabled, require TOTP code in request body
    if (user.twoFaEnabled && user.twoFaSecret) {
      const totpCode = body.totpCode as string | undefined;
      if (!totpCode) {
        return NextResponse.json({ code: '2fa_required', requires2FA: true }, { status: 403 });
      }
      if (!verifyTotp(user.twoFaSecret, totpCode)) {
        return errorResponse('invalid_2fa_code', 'Invalid 2FA code', 403);
      }
    }

    const scope = isAdminRole(user.role) ? ['*'] : ['read:pamm_stats'];
    const jwtId = randomUUID();
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role as JwtPayload['role'],
      jti: jwtId,
      scope,
    };

    const [accessToken, refreshToken] = await Promise.all([
      signJwt(payload),
      signRefreshToken(user.id),
    ]);

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

    const response = setLocaleCookie(
      setAuthCookies(
        NextResponse.json({
          user: { id: user.id, email: user.email, role: user.role, name: user.name, locale: user.locale },
        }),
        { accessToken, refreshToken },
      ),
      user.locale,
    );

    // Best-effort bridge to backend forex auth. Customers with a stored
    // api_token (issued at backend signup) get a JWT pair stamped on the
    // browser as `forex_*_token` cookies so the portal can transact
    // against `/api/forex/*` without the browser ever holding the raw
    // api_token. Failure here NEVER blocks FE-side login.
    if (user.forexApiToken && !isAdminRole(user.role)) {
      try {
        const forexTokens = await forexLogin({
          email: user.email,
          apiToken: user.forexApiToken,
        });
        setForexCookies(response, {
          accessToken: forexTokens.access_token,
          refreshToken: forexTokens.refresh_token,
          expiresIn: forexTokens.expires_in,
          refreshExpiresIn: forexTokens.refresh_expires_in,
        });
        await prisma.user.update({
          where: { id: user.id },
          data: { forexLinkedAt: new Date() },
        });
      } catch (bridgeErr) {
        if (bridgeErr instanceof ForexApiError) {
          log.warn(`forex bridge failed for ${user.email}: ${bridgeErr.code}`);
        } else {
          log.error('forex bridge unexpected:', bridgeErr);
        }
      }
    }

    return response;
  } catch (error) {
    log.error('Login error:', error);
    return errorResponse('internal_error', 'Internal server error', 500);
  }
}
