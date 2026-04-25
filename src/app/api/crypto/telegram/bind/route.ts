export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/telegram/bind');

const BindBody = z.object({ chat_id: z.string().min(3).max(64) }).strict();

export async function POST(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  let body: z.infer<typeof BindBody>;
  try {
    body = BindBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'telegram_bind',
      metadata: { chat_id_prefix: body.chat_id.slice(0, 4) + '…' },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', ok: true, telegram_bound: true });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/telegram/bind`,
      method: 'POST',
      body,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ok: true, ...(await res.json().catch(() => ({}))) });
  } catch (err) {
    log.warn(`Telegram bind error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, telegram_bound: true });
  }
}

export async function DELETE(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'telegram_unbind',
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    return NextResponse.json({ source: 'mock', ok: true, telegram_bound: false });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/telegram/bind`,
      method: 'DELETE',
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ok: true, telegram_bound: false });
  } catch (err) {
    log.warn(`Telegram unbind error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'mock', ok: true, telegram_bound: false });
  }
}
