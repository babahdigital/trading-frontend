import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AUTH_COOKIE_NAMES } from '@/lib/auth/cookies';
import { verifyJwt } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { forexCreateCheckout } from '@/lib/forex/billing';
import { setForexCookies } from '@/lib/forex/cookies';
import { ensureForexAccessToken } from '@/lib/forex/session';
import { ForexApiError, UPGRADEABLE_TIERS } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('api/forex/billing/checkout');

async function resolveFeUserId(): Promise<string | null> {
  const jar = await cookies();
  const accessJwt = jar.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  if (!accessJwt) return null;
  const claims = await verifyJwt(accessJwt);
  return claims?.sub ?? null;
}

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

  const feUserId = await resolveFeUserId();
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
    if (feUserId) {
      void prisma.auditLog
        .create({
          data: {
            userId: feUserId,
            action: 'forex.checkout.created',
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
            userAgent: request.headers.get('user-agent'),
            metadata: {
              target_tier: body.target_tier,
              external_order_id: data.external_order_id,
              amount_idr: data.amount_idr,
              expires_at: data.expires_at,
            },
          },
        })
        .catch((auditErr) => log.warn(`audit insert failed for checkout: ${String(auditErr)}`));
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
