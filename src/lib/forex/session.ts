/**
 * Server-side helper that returns a fresh backend access token, refreshing
 * automatically when the access cookie is missing or expiring.
 *
 * Pattern:
 *   const session = await ensureForexAccessToken();
 *   if (!session) return 401 unauthenticated;
 *   const data = await forexInitiateTierUpgrade({ accessToken: session.accessToken, targetTier });
 *
 * If a refresh happens, the caller MUST attach `session.setCookieHeaders`
 * to the outgoing NextResponse so the rotated tokens persist in the browser.
 */

import { cookies } from 'next/headers';

import { forexRefresh } from './auth';
import { FOREX_COOKIE_NAMES } from './cookies';
import { ForexApiError, isAccessTokenExpiring } from './types';

export interface ForexSession {
  accessToken: string;
  refreshToken: string;
  /** True if the tokens were rotated during this call. */
  rotated: boolean;
}

/**
 * Read forex tokens from cookies; if access is missing or near expiry and
 * a refresh token is present, rotate the pair and return the fresh values.
 * Returns null when no usable session exists (caller should 401).
 *
 * NOTE: This helper only READS / ROTATES tokens. To persist a rotated pair
 * the caller must call `setForexCookies` on the outgoing NextResponse.
 * The `rotated` flag indicates whether persistence is needed.
 */
export async function ensureForexAccessToken(): Promise<ForexSession | null> {
  const jar = cookies();
  const access = jar.get(FOREX_COOKIE_NAMES.ACCESS)?.value;
  const refresh = jar.get(FOREX_COOKIE_NAMES.REFRESH)?.value;

  if (access && !isAccessTokenExpiring(access)) {
    return { accessToken: access, refreshToken: refresh ?? '', rotated: false };
  }
  if (!refresh) return null;

  try {
    const pair = await forexRefresh({ refreshToken: refresh });
    return {
      accessToken: pair.access_token,
      refreshToken: pair.refresh_token,
      rotated: true,
    };
  } catch (err) {
    if (err instanceof ForexApiError) return null;
    throw err;
  }
}

export function hasForexSessionCookies(): boolean {
  return Boolean(cookies().get(FOREX_COOKIE_NAMES.ACCESS)?.value);
}
