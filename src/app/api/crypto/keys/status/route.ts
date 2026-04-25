export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { mockKeysMetadata } from '@/lib/proxy/crypto-mock';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/keys/status');

/**
 * Read Vault metadata for tenant's Binance key. NEVER returns secret.
 * Backend path: GET /api/tenants/{id}/keys
 */
export async function GET(request: NextRequest) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const tenantId = gate.subscription.cryptoTenantId;
  if (!cryptoBackendConfigured() || !tenantId) {
    const meta = mockKeysMetadata();
    return NextResponse.json({
      source: 'mock',
      connected: gate.subscription.apiKeyConnected,
      last_verified_at: gate.subscription.apiKeyVerifiedAt?.toISOString() ?? null,
      permissions: gate.subscription.apiKeyConnected
        ? { canRead: true, canTrade: true, canWithdraw: false }
        : meta.permissions,
      vault_path: meta.vault_path,
      ip_whitelist: meta.ip_whitelist,
    });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'keys',
      path: `/api/tenants/${encodeURIComponent(tenantId)}/keys`,
      forwardUserId: gate.userId,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      log.warn(`Key status HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...errBody }, { status: res.status });
    }
    const data = await res.json();
    return NextResponse.json({
      source: 'backend',
      connected: gate.subscription.apiKeyConnected,
      last_verified_at: data.last_verified_at ?? null,
      permissions: data.permissions ?? { canRead: false, canTrade: false, canWithdraw: false },
      vault_path: data.vault_path ?? null,
      ip_whitelist: data.ip_whitelist ?? null,
    });
  } catch (err) {
    log.warn(`Key status error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
