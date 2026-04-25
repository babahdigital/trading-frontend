export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/keys/submit');

const SubmitBody = z
  .object({
    api_key: z.string().min(8).max(128),
    api_secret: z.string().min(8).max(256),
    testnet: z.boolean().default(false),
  })
  .strict();

export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  let body: z.infer<typeof SubmitBody>;
  try {
    body = SubmitBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  // Audit attempt (don't log raw key)
  const auditMeta = {
    testnet: body.testnet,
    key_prefix: body.api_key.slice(0, 6) + '…',
    submitted_at: new Date().toISOString(),
  };

  if (!cryptoBackendConfigured()) {
    // Mock path: simulate happy outcome locally so onboarding flow can be demo'd
    await prisma.cryptoBotSubscription.update({
      where: { id: gate.subscription.id },
      data: {
        cryptoTenantId: gate.subscription.cryptoTenantId ?? `mock_${gate.subscription.id}`,
        binanceUidHash: 'mock_uid_hash',
        apiKeyConnected: true,
        apiKeyVerifiedAt: new Date(),
        status: 'ACTIVE',
        activatedAt: gate.subscription.activatedAt ?? new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.cryptoAuditTrail.create({
      data: {
        subscriptionId: gate.subscription.id,
        action: 'key_submit_mock',
        metadata: auditMeta,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      },
    });
    return NextResponse.json({
      source: 'mock',
      ok: true,
      verified: true,
      tenant_id: `mock_${gate.subscription.id}`,
      permissions: { canTrade: true, canRead: true, canWithdraw: false },
    });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'keys',
      path: '/api/keys/submit',
      method: 'POST',
      body: {
        babahalgo_user_id: gate.userId,
        tier: gate.subscription.tier,
        api_key: body.api_key,
        api_secret: body.api_secret,
        testnet: body.testnet,
      },
      forwardUserId: gate.userId,
    });

    const text = await res.text();
    let payload: Record<string, unknown> = {};
    try { payload = JSON.parse(text); } catch { /* leave empty */ }

    if (!res.ok) {
      log.warn(`Key submit HTTP ${res.status}`);
      await prisma.cryptoAuditTrail.create({
        data: {
          subscriptionId: gate.subscription.id,
          action: 'key_submit_failed',
          metadata: { ...auditMeta, status: res.status, error_code: payload.error ?? null },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
      return NextResponse.json({ error: 'submit_failed', status: res.status, ...payload }, { status: res.status });
    }

    const tenantId = String(payload.tenant_id ?? '');
    const uidHash = String(payload.binance_uid_hash ?? '');

    await prisma.cryptoBotSubscription.update({
      where: { id: gate.subscription.id },
      data: {
        cryptoTenantId: tenantId || gate.subscription.cryptoTenantId,
        binanceUidHash: uidHash || gate.subscription.binanceUidHash,
        apiKeyConnected: true,
        apiKeyVerifiedAt: new Date(),
        status: 'ACTIVE',
        activatedAt: gate.subscription.activatedAt ?? new Date(),
        updatedAt: new Date(),
      },
    });
    await prisma.cryptoAuditTrail.create({
      data: {
        subscriptionId: gate.subscription.id,
        action: 'key_submit_ok',
        metadata: { ...auditMeta, tenant_id: tenantId, uid_hash_prefix: uidHash.slice(0, 12) + '…' },
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      },
    });

    return NextResponse.json({ source: 'backend', ok: true, ...payload });
  } catch (err) {
    log.error(`Key submit error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
