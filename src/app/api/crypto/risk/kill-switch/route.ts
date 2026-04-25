export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/risk/kill-switch');

const KillBody = z
  .object({
    reason: z.string().min(3).max(280),
  })
  .strict();

/**
 * Self-serve emergency kill switch for the customer's own tenant.
 *
 * Per Sprint X+1.2 the backend kill switch endpoint moved to admin scope
 * (`/api/admin/kill-switch/tenants/{id}`). We expose a customer-facing
 * proxy that uses the admin scope token internally — request still
 * audit-logged with userId so operators can trace who triggered it.
 */
export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  let body: z.infer<typeof KillBody>;
  try {
    body = KillBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  await prisma.cryptoBotSubscription.update({
    where: { id: gate.subscription.id },
    data: { status: 'PAUSED', updatedAt: new Date() },
  });
  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'kill_switch_triggered',
      metadata: { reason: body.reason, triggered_by_user: gate.userId },
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
      scope: 'admin',
      path: `/api/admin/kill-switch/tenants/${encodeURIComponent(tenantId)}`,
      method: 'POST',
      body: { reason: `customer-self-serve: ${body.reason}` },
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Kill switch HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    const data = await res.json().catch(() => ({}));
    return NextResponse.json({ source: 'backend', ok: true, paused: true, ...data });
  } catch (err) {
    log.warn(`Kill switch error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, paused: true });
  }
}
