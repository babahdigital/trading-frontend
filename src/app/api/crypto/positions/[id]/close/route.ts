export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/positions/close');

/**
 * Manual market-close on a single position.
 * Backend returns 202 Accepted; reconciler/execution_worker actually closes.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCryptoEligible(request, { requireKeyConnected: true });
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!id || !/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: 'invalid_position_id' }, { status: 400 });
  }

  await prisma.cryptoAuditTrail.create({
    data: {
      subscriptionId: gate.subscription.id,
      action: 'position_close_request',
      metadata: { position_id: id, requested_by_user: gate.userId },
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] ?? null,
      userAgent: request.headers.get('user-agent') ?? null,
    },
  });

  if (!cryptoBackendConfigured()) {
    return NextResponse.json({ source: 'mock', ok: true, status: 'closing', position_id: id });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'admin',
      path: `/api/positions/${encodeURIComponent(id)}/close`,
      method: 'POST',
      forwardUserId: gate.userId,
    });
    if (!res.ok && res.status !== 202) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Position close HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    return NextResponse.json({ source: 'backend', ok: true, status: 'closing', position_id: id });
  } catch (err) {
    log.warn(`Position close error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
