import { NextRequest, NextResponse } from 'next/server';

import { forexLogoutSafe } from '@/lib/forex/auth';
import { FOREX_COOKIE_NAMES, clearForexCookies } from '@/lib/forex/cookies';

/**
 * POST /api/forex/auth/logout — best-effort revoke + cookie clear.
 *
 * Always returns 200 with cleared cookies so the FE can rely on the
 * post-logout state being clean even if the backend is unreachable. The
 * underlying backend `/auth/logout` is idempotent — replays are no-ops.
 */
export async function POST(request: NextRequest) {
  try {
  const access = request.cookies.get(FOREX_COOKIE_NAMES.ACCESS)?.value;
  const refresh = request.cookies.get(FOREX_COOKIE_NAMES.REFRESH)?.value;
  if (access && refresh) {
    await forexLogoutSafe({ accessToken: access, refreshToken: refresh });
  }
  const response = NextResponse.json({ ok: true, revoked: true });
  return clearForexCookies(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
