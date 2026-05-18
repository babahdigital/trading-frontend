import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { forexInitiateTierUpgrade } from '@/lib/forex/billing';
import { setForexCookies } from '@/lib/forex/cookies';
import { ensureForexAccessToken } from '@/lib/forex/session';
import { ForexApiError, UPGRADEABLE_TIERS } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/forex/me/tier-upgrade');

const Body = z.object({
  target_tier: z.enum(UPGRADEABLE_TIERS as [string, ...string[]]),
});

/**
 * POST /api/forex/me/tier-upgrade — proxy to backend `/me/tier/upgrade`.
 *
 * Customer-initiated tier escalation; backend delegates to the shared
 * CheckoutService (same Midtrans/Xendit pipeline as /billing/checkout)
 * with idempotent dedup over a 30-minute window.
 */
export async function POST(request: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await request.json());
  } catch (err) {
    const issues = err instanceof z.ZodError ? err.issues : [];
    return NextResponse.json(
      { code: 'VALIDATION_FAILED', message: 'Invalid upgrade payload', details: { issues } },
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
    const data = await forexInitiateTierUpgrade({
      accessToken: session.accessToken,
      targetTier: body.target_tier as never,
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
      log.warn(`tier upgrade failed ${err.status} ${err.code}`);
      return NextResponse.json(
        { code: err.code, message: err.envelope.message, details: err.envelope.details },
        { status: err.status },
      );
    }
    log.error('tier upgrade unexpected error:', err);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'Tier upgrade failed' },
      { status: 500 },
    );
  }
}
