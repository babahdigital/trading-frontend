import { NextResponse } from 'next/server';

import { setForexCookies } from '@/lib/forex/cookies';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { forexMe } from '@/lib/forex/me';
import { ensureForexAccessToken } from '@/lib/forex/session';
import { ForexApiError } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/forex/me');

/**
 * GET /api/forex/me — current backend tenant snapshot (tier, products,
 * language). Used by the portal to render tier-gated UI without leaking
 * the full forex access token to the browser.
 */
export async function GET() {
  const session = await ensureForexAccessToken();
  if (!session) {
    return NextResponse.json(
      { code: 'AUTH_TOKEN_REQUIRED', message: 'Not authenticated against forex backend' },
      { status: 401 },
    );
  }
  try {
    const data = await forexMe({ accessToken: session.accessToken });
    const response = NextResponse.json({ ok: true, ...data });
    if (session.rotated) {
      setForexCookies(response, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    }
    return response;
  } catch (err) {
    if (err instanceof ForexApiError) {
      log.info(`me lookup failed ${err.status} ${err.code}`);
      return NextResponse.json(
        { code: err.code, message: err.envelope.message },
        { status: err.status },
      );
    }
    log.error('me lookup unexpected error:', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Me lookup failed' },
      { status: 500 },
    );
  }
}
