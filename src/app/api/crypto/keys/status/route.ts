export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockKeyStatus } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/keys/status');

export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    const status = mockKeyStatus();
    return NextResponse.json({
      source: 'mock',
      connected: gate.subscription.apiKeyConnected,
      last_verified_at: gate.subscription.apiKeyVerifiedAt?.toISOString() ?? null,
      permissions: gate.subscription.apiKeyConnected
        ? { canTrade: true, canRead: true, canWithdraw: false }
        : status.permissions,
    });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'keys',
      path: `/api/keys/${encodeURIComponent(tenantId)}/status`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Key status HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({ source: 'backend', ...data });
  } catch (err) {
    log.warn(`Key status error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
