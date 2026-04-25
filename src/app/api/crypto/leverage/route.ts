export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockLeverage } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/leverage');

const PatchBody = z.object({
  user_leverage_override: z.number().int().min(1).max(125),
}).strict();

const TIER_LEVERAGE_CAP: Record<string, number> = {
  CRYPTO_BASIC: 5,
  CRYPTO_PRO: 10,
  CRYPTO_HNWI: 15,
};

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({
      source: 'mock',
      tier: gate.subscription.tier,
      profile_cap: TIER_LEVERAGE_CAP[gate.subscription.tier] ?? 5,
      ...mockLeverage(),
    });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'trades',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/leverage`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      log.warn(`Leverage backend HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...body }, { status: res.status });
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', tier: gate.subscription.tier, ...body });
  } catch (err) {
    log.warn(`Leverage GET error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({
      source: 'mock',
      tier: gate.subscription.tier,
      profile_cap: TIER_LEVERAGE_CAP[gate.subscription.tier] ?? 5,
      ...mockLeverage(),
    });
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireCryptoEligible(request);
  if (!gate.ok) return gate.response;

  let body: z.infer<typeof PatchBody>;
  try {
    body = PatchBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const cap = TIER_LEVERAGE_CAP[gate.subscription.tier] ?? 5;
  if (body.user_leverage_override > cap) {
    return NextResponse.json(
      {
        error: 'tier_leverage_exceeded',
        message: `Tier ${gate.subscription.tier} maks leverage ${cap}x. Upgrade tier untuk leverage lebih besar.`,
        max_allowed: cap,
      },
      { status: 403 },
    );
  }

  // Mirror to local subscription
  await prisma.cryptoBotSubscription.update({
    where: { id: gate.subscription.id },
    data: { maxLeverage: body.user_leverage_override, updatedAt: new Date() },
  });
  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'leverage_override',
      metadata: { user_leverage_override: body.user_leverage_override, tier_cap: cap },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', ok: true, user_leverage_override: body.user_leverage_override });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/leverage`,
      method: 'PATCH',
      body,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Leverage PATCH HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ source: 'backend', ok: true, ...data });
  } catch (err) {
    log.warn(`Leverage PATCH error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, user_leverage_override: body.user_leverage_override });
  }
}
