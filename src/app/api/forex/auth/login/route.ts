import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { forexLogin } from '@/lib/forex/auth';
import { setForexCookies } from '@/lib/forex/cookies';
import { ForexApiError } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/forex/auth/login');

const Body = z.object({
  email: z.string().email().min(3).max(320),
  api_token: z.string().min(8).max(128),
});

/**
 * POST /api/forex/auth/login — thin proxy to backend `/api/forex/auth/login`.
 *
 * Bridges (email + api_token) → backend JWT pair → HttpOnly cookies on
 * the babahalgo origin. The browser never sees the tokens.
 *
 * Body matches backend contract verbatim so the FE caller (admin tooling,
 * future React Native client, etc.) can use the same payload shape.
 */
export async function POST(request: NextRequest) {
  let payload: z.infer<typeof Body>;
  try {
    payload = Body.parse(await request.json());
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : [];
    return NextResponse.json(
      { code: 'VALIDATION_FAILED', message: 'Invalid login payload', details: { issues } },
      { status: 422 },
    );
  }

  try {
    const tokens = await forexLogin({ email: payload.email, apiToken: payload.api_token });
    const response = NextResponse.json({
      ok: true,
      token_type: tokens.token_type,
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
      log.warn(`forex login failed ${err.status} ${err.code}`);
      return NextResponse.json(
        { code: err.code, message: err.envelope.message, details: err.envelope.details },
        { status: err.status },
      );
    }
    log.error('forex login unexpected error:', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Login failed' },
      { status: 500 },
    );
  }
}
