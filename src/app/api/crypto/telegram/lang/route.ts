export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/telegram/lang');

const PatchBody = z.object({ lang: z.enum(['id', 'en']) }).strict();

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', tenant_id: tenantId ?? null, notification_lang: 'id' });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/telegram/lang`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      return NextResponse.json({ source: 'mock', tenant_id: tenantId, notification_lang: 'id' });
    }
    return NextResponse.json({ source: 'backend', ...(await res.json()) });
  } catch (err) {
    log.warn(`Telegram lang GET error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', tenant_id: tenantId, notification_lang: 'id' });
  }
}

export async function PATCH(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
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

  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'telegram_lang_change',
      metadata: { lang: body.lang },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', tenant_id: tenantId ?? null, notification_lang: body.lang });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/telegram/lang`,
      method: 'PATCH',
      body,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ...(await res.json()) });
  } catch (err) {
    log.warn(`Telegram lang PATCH error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', tenant_id: tenantId, notification_lang: body.lang });
  }
}
