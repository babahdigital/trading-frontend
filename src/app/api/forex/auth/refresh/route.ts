import { NextRequest, NextResponse } from 'next/server';

import { forexRefresh } from '@/lib/forex/auth';
import {
  FOREX_COOKIE_NAMES,
  clearForexCookies,
  setForexCookies,
} from '@/lib/forex/cookies';
import { ForexApiError } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/forex/auth/refresh');

/**
 * POST /api/forex/auth/refresh — rotates the backend access+refresh pair.
 *
 * Reads `forex_refresh_token` cookie (path=/api, SameSite=Strict). On a
 * replay (`AUTH_REFRESH_REPLAYED`) or invalid token, backend revokes the
 * descendant chain — we mirror that by clearing both cookies.
 */
export async function POST(request: NextRequest) {
  const refresh = request.cookies.get(FOREX_COOKIE_NAMES.REFRESH)?.value;
  if (!refresh) {
    return NextResponse.json(
      { code: 'AUTH_REFRESH_INVALID', message: 'Missing refresh token cookie' },
      { status: 401 },
    );
  }
  try {
    const tokens = await forexRefresh({ refreshToken: refresh });
    const response = NextResponse.json({
      ok: true,
      rotated: true,
      expires_in: tokens.expires_in,
      refresh_expires_in: tokens.refresh_expires_in,
    });
    return setForexCookies(response, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresIn: tokens.expires_in,
      refreshExpiresIn: tokens.refresh_expires_in,
    });
  } catch (err) {
    if (err instanceof ForexApiError) {
      log.info(`forex refresh failed ${err.status} ${err.code}`);
      const response = NextResponse.json(
        { code: err.code, message: err.envelope.message },
        { status: err.status },
      );
      return clearForexCookies(response);
    }
    log.error('forex refresh unexpected error:', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Refresh failed' },
      { status: 500 },
    );
  }
}
