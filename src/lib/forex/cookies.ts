/**
 * Forex backend token cookies. Kept separate from `lib/auth/cookies.ts`
 * (FE-internal JWT) so revoking a backend session does not affect the
 * FE-side login state and vice-versa.
 *
 * Why HttpOnly: tokens never touched by client JS — XSS-safe.
 * Why SameSite=lax for access: browser navigation should keep the
 * backend session warm (e.g. user clicks an email deep-link).
 * Why SameSite=strict + path=/api for refresh: refresh tokens never
 * need to ride cross-site GETs.
 */

import type { NextResponse } from 'next/server';

export const FOREX_COOKIE_NAMES = {
  ACCESS: 'forex_access_token',
  REFRESH: 'forex_refresh_token',
} as const;

const ACCESS_MAX_AGE = 15 * 60; // matches backend default access_ttl_sec
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60; // matches backend default refresh_ttl_sec

export interface ForexTokenPair {
  accessToken: string;
  refreshToken: string;
  /** Backend-reported access TTL in seconds (used to align cookie maxAge). */
  expiresIn?: number;
  /** Backend-reported refresh TTL in seconds. */
  refreshExpiresIn?: number;
}

export function setForexCookies(
  response: NextResponse,
  tokens: ForexTokenPair,
): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: FOREX_COOKIE_NAMES.ACCESS,
    value: tokens.accessToken,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: tokens.expiresIn ?? ACCESS_MAX_AGE,
  });
  response.cookies.set({
    name: FOREX_COOKIE_NAMES.REFRESH,
    value: tokens.refreshToken,
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api',
    maxAge: tokens.refreshExpiresIn ?? REFRESH_MAX_AGE,
  });
  return response;
}

export function clearForexCookies(response: NextResponse): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';
  response.cookies.set({
    name: FOREX_COOKIE_NAMES.ACCESS,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: FOREX_COOKIE_NAMES.REFRESH,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api',
    maxAge: 0,
  });
  return response;
}
