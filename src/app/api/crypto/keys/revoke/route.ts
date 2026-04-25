export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/keys/revoke');

export async function DELETE(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  await prisma.cryptoBotSubscription.update({
    where: { id: gate.subscription.id },
    data: {
      apiKeyConnected: false,
      apiKeyVerifiedAt: null,
      binanceUidHash: null,
      status: 'PAUSED',
      updatedAt: new Date(),
    },
  });
  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'key_revoke',
      metadata: { revoked_at: new Date().toISOString() },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', ok: true, paused: true });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'keys',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/keys`,
      method: 'DELETE',
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Key revoke HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ok: true, paused: true });
  } catch (err) {
    log.warn(`Key revoke error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, paused: true });
  }
}
