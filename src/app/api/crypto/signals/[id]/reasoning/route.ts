/**
 * FE proxy untuk GET /api/signals/{id}/reasoning — per-entry audit detail.
 *
 * Backend rc38.1 ship token-level fact-checked reasoning untuk setiap
 * signal entry (regime, confluence, drivers, risks). Math-only — bukan
 * LLM narrative (LLM Phase E future + verified).
 *
 * Auth required (signed-in customer dengan crypto subscription) — backend
 * cross-check signal ownership via tenant_id di signal record.
 *
 * Scope: SIGNALS (read-only audit trail).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';
import { requireCryptoEligible } from '@/lib/auth/crypto-eligibility';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/crypto/signals/reasoning');

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const gate = await requireCryptoEligible(request, { allowPaused: true });
  if (!gate.ok) return gate.response;

  const { id: signalId } = await params;
  if (!signalId || !/^[a-zA-Z0-9_-]{1,64}$/.test(signalId)) {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_signal_id' }, { status: 400 });
  }

  if (!cryptoBackendConfigured()) {
    return NextResponse.json({ source: 'unconfigured', available: false }, { status: 200 });
  }

  try {
    const res = await proxyToCryptoBackend({
      scope: 'signals',
      // /api/signals/{id}/reasoning bukan tenant-scoped path —
      // backend pakai signal_id sebagai gate (signal record punya tenant_id
      // yang di-check against X-Tenant-Id header)
      path: `/api/signals/${encodeURIComponent(signalId)}/reasoning`,
      forwardUserId: gate.userId,
      tenantId: gate.subscription.cryptoTenantId ?? undefined,
    });
    if (!res.ok) {
      log.warn(`Signal reasoning backend HTTP ${res.status} signal=${signalId}`);
      return NextResponse.json(
        { source: 'backend', error: 'backend_failed', status: res.status },
        { status: res.status },
      );
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', ...body });
  } catch (err) {
    log.warn(`Signal reasoning error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ source: 'error', available: false }, { status: 200 });
  }
}
