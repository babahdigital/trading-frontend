import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { forexCreateCheckout } from '@/lib/forex/billing';
import { setForexCookies } from '@/lib/forex/cookies';
import { ensureForexAccessToken } from '@/lib/forex/session';
import { ForexApiError, UPGRADEABLE_TIERS } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/forex/billing/checkout');

const Body = z.object({
  target_tier: z.enum(UPGRADEABLE_TIERS as [string, ...string[]]),
  currency: z.literal('IDR').optional(),
});

/**
 * POST /api/forex/billing/checkout — proxy to backend Midtrans Snap.
 *
 * Auto-refreshes the access token if it's near expiry. On success, the
 * returned `redirect_url` is the Midtrans-hosted Snap page; the FE
 * redirects the browser there. The settlement webhook (server-to-server)
 * flips the row to `paid` and promotes the tenant tier asynchronously.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : [];
    return NextResponse.json(
      { code: 'VALIDATION_FAILED', message: 'Invalid checkout payload', details: { issues } },
      { status: 422 },
    );
  }

  const session = await ensureForexAccessToken();
  if (!session) {
    return NextResponse.json(
      { code: 'AUTH_TOKEN_REQUIRED', message: 'Forex session expired — please re-login' },
      { status: 401 },
    );
  }

  try {
    const data = await forexCreateCheckout({
      accessToken: session.accessToken,
      targetTier: body.target_tier as never,
      currency: body.currency,
    });
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
      log.warn(`checkout failed ${err.status} ${err.code}`);
      return NextResponse.json(
        { code: err.code, message: err.envelope.message, details: err.envelope.details },
        { status: err.status },
      );
    }
    log.error('checkout unexpected error:', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Checkout failed' },
      { status: 500 },
    );
  }
}
