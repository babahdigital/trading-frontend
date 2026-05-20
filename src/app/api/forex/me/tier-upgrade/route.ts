import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { AUTH_COOKIE_NAMES } from '@/lib/auth/cookies';
import { verifyJwt } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';
import { forexInitiateTierUpgrade } from '@/lib/forex/billing';
import { setForexCookies } from '@/lib/forex/cookies';
import { ensureForexAccessToken } from '@/lib/forex/session';
import { ForexApiError, UPGRADEABLE_TIERS } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const log = createLogger('api/forex/me/tier-upgrade');

async function resolveFeUserId(): Promise<string | null> {
  const jar = await cookies();
  const accessJwt = jar.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  if (!accessJwt) return null;
  const claims = await verifyJwt(accessJwt);
  return claims?.sub ?? null;
}

function clientIp(request: NextRequest): string | null {
  return (
    request.headers.get('x-forwarded-for') ||
    request.headers.get('x-real-ip') ||
    null
  );
}

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

  const feUserId = await resolveFeUserId();
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
    if (feUserId) {
      // Best-effort compliance trail — failure here does not abort the
      // upgrade, but a missing audit row should not block the customer.
      void prisma.auditLog
        .create({
          data: {
            userId: feUserId,
            action: 'forex.tier_upgrade.initiated',
            ipAddress: clientIp(request),
            userAgent: request.headers.get('user-agent'),
            metadata: {
              target_tier: body.target_tier,
              current_tier: data.current_tier,
              external_order_id: data.external_order_id,
              duplicate_pending: Boolean(data.duplicate_pending),
              expires_at: data.expires_at,
            },
          },
        })
        .catch((auditErr) => {
          log.warn(`audit insert failed for tier upgrade: ${String(auditErr)}`);
        });
    }
    return response;
  } catch (err) {
    if (err instanceof ForexApiError) {
      log.warn(`tier upgrade failed ${err.status} ${err.code}`);
      if (feUserId) {
        void prisma.auditLog
          .create({
            data: {
              userId: feUserId,
              action: 'forex.tier_upgrade.failed',
              ipAddress: clientIp(request),
              userAgent: request.headers.get('user-agent'),
              metadata: {
                target_tier: body.target_tier,
                code: err.code,
                status: err.status,
                message: err.envelope.message,
              },
            },
          })
          .catch(() => undefined);
      }
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
