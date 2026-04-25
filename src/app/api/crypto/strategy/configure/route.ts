export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/strategy/configure');

const ConfigureBody = z
  .object({
    strategy_name: z.string().min(1).max(64),
    enabled: z.boolean().default(true),
    params: z.record(z.unknown()).optional(),
  })
  .strict();

export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request);
  if (!gate.ok) return gate.response;

  let body: z.infer<typeof ConfigureBody>;
  try {
    body = ConfigureBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  // Update local subscription record (even when backend mocked) so user UI is consistent
  await prisma.cryptoBotSubscription.update({
    where: { id: gate.subscription.id },
    data: { selectedStrategy: body.strategy_name, updatedAt: new Date() },
  });
  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'strategy_configure',
      metadata: JSON.parse(JSON.stringify({
        strategy_name: body.strategy_name,
        enabled: body.enabled,
        params: body.params ?? {},
      })),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', ok: true, strategy_name: body.strategy_name });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/strategy/${encodeURIComponent(tenantId)}/configure`,
      method: 'POST',
      body,
      forwardUserId: gate.userId,
    });
    const text = await res.text();
    let payload: unknown;
    try { payload = JSON.parse(text); } catch { payload = { raw: text }; }
    if (!res.ok) {
      log.warn(`Strategy configure backend HTTP ${res.status}`);
      return NextResponse.json(
        { error: 'backend_failed', status: res.status, ...(typeof payload === 'object' ? payload : {}) },
        { status: res.status },
      );
    }
    return NextResponse.json({ source: 'backend', ok: true, ...(typeof payload === 'object' ? payload : {}) });
  } catch (err) {
    log.warn(`Strategy configure error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, strategy_name: body.strategy_name });
  }
}
