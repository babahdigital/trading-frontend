export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockRiskProfile } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/risk/profile');

const ProfileBody = z
  .object({
    max_leverage: z.number().int().min(1).max(125).optional(),
    max_concurrent_positions: z.number().int().min(1).max(20).optional(),
    max_daily_loss_usd: z.number().min(0).optional(),
    liquidation_buffer_atr: z.number().min(0).max(20).optional(),
    risk_per_trade_pct: z.number().min(0).max(10).optional(),
    loss_streak_threshold: z.number().int().min(0).max(20).optional(),
    loss_streak_cooldown_min: z.number().int().min(0).max(1440).optional(),
  })
  .strict();

const TIER_LEVERAGE_CAP: Record<string, number> = {
  CRYPTO_BASIC: 5,
  CRYPTO_PRO: 10,
  CRYPTO_HNWI: 15,
};

const TIER_POS_CAP: Record<string, number> = {
  CRYPTO_BASIC: 3,
  CRYPTO_PRO: 5,
  CRYPTO_HNWI: 8,
};

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', tier: gate.subscription.tier, ...mockRiskProfile() });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/risk/${encodeURIComponent(tenantId)}/profile`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      return NextResponse.json({ source: 'mock', tier: gate.subscription.tier, ...mockRiskProfile() });
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', tier: gate.subscription.tier, ...body });
  } catch (err) {
    log.warn(`Risk profile read error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', tier: gate.subscription.tier, ...mockRiskProfile() });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request);
  if (!gate.ok) return gate.response;

  let body: z.infer<typeof ProfileBody>;
  try {
    body = ProfileBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  // Tier cap enforcement
  const leverageCap = TIER_LEVERAGE_CAP[gate.subscription.tier] ?? 5;
  const posCap = TIER_POS_CAP[gate.subscription.tier] ?? 3;
  if (body.max_leverage && body.max_leverage > leverageCap) {
    return NextResponse.json({
      error: 'tier_leverage_exceeded',
      message: `Tier ${gate.subscription.tier} maks leverage ${leverageCap}x. Upgrade ke tier lebih tinggi untuk leverage lebih besar.`,
      max_allowed: leverageCap,
    }, { status: 403 });
  }
  if (body.max_concurrent_positions && body.max_concurrent_positions > posCap) {
    return NextResponse.json({
      error: 'tier_position_cap_exceeded',
      message: `Tier ${gate.subscription.tier} maks ${posCap} posisi paralel.`,
      max_allowed: posCap,
    }, { status: 403 });
  }

  // Mirror to local subscription
  await prisma.cryptoBotSubscription.update({
    where: { id: gate.subscription.id },
    data: {
      ...(body.max_leverage != null ? { maxLeverage: body.max_leverage } : {}),
      updatedAt: new Date(),
    },
  });
  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'risk_profile_update',
      metadata: { ...body },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', ok: true, ...body });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/risk/${encodeURIComponent(tenantId)}/profile`,
      method: 'POST',
      body,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Risk profile update HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ok: true });
  } catch (err) {
    log.warn(`Risk profile update error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, ...body });
  }
}
