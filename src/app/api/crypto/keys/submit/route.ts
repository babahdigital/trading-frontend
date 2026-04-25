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

  const auditMeta = {
    testnet: body.testnet,
    key_prefix: body.api_key.slice(0, 6) + '…',
    submitted_at: new Date().toISOString(),
  };

  // Mock fallback when backend not configured
  if (!cryptoBackendConfigured()) {
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

  // Backend path: requires existing tenant_id (provisioned earlier via admin onboarding)
  const tenantId = gate.subscription.cryptoTenantId;
  if (!tenantId) {
    return NextResponse.json(
      {
        error: 'tenant_not_provisioned',
        message: 'Tenant crypto Anda belum disiapkan. Hubungi support untuk provisioning awal.',
      },
      { status: 409 },
    );
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'keys',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/keys`,
      method: 'POST',
      body: {
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
          metadata: { ...auditMeta, status: res.status, error_code: payload.detail ?? null },
          ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
          userAgent: request.headers.get('user-agent') ?? null,
        },
      });
      return NextResponse.json({ error: 'submit_failed', status: res.status, ...payload }, { status: res.status });
    }

    await prisma.cryptoBotSubscription.update({
      where: { id: gate.subscription.id },
      data: {
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
        metadata: auditMeta,
        ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
        userAgent: request.headers.get('user-agent') ?? null,
      },
    });

    return NextResponse.json({ source: 'backend', ok: true, verified: true, ...payload });
  } catch (err) {
    log.error(`Key submit error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
