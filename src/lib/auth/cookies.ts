import type { NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes — matches signJwt TTL
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60; // 7 days — matches session.expiresAt

const isProd = process.env.NODE_ENV === 'production';

/**
 * Attach HTTP-only auth cookies to a response.
 *
 * Why HttpOnly: prevents `document.cookie` / XSS from reading the token —
 * the prior implementation persisted to localStorage AND set a JS-readable
 * cookie, both XSS-exfiltrable. HttpOnly closes that surface entirely.
 *
 * Why SameSite=Lax for access: balances CSRF defense with cross-tab nav
 * (e.g. user clicks a babahalgo.com email link, lands authenticated).
 *
 * Why SameSite=Strict for refresh: refresh tokens are pure session lifecycle
 * — they never need to ride along on cross-site GETs, so be paranoid.
 */
export function setAuthCookies(
  response: NextResponse,
  tokens: { accessToken: string; refreshToken: string },
): NextResponse {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: tokens.accessToken,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: tokens.refreshToken,
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });
  return response;
}

export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set({
    name: ACCESS_TOKEN_COOKIE,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.cookies.set({
    name: REFRESH_TOKEN_COOKIE,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 0,
  });
  return response;
}

export const AUTH_COOKIE_NAMES = {
  ACCESS_TOKEN: ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN: REFRESH_TOKEN_COOKIE,
} as const;
