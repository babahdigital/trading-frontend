export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/tenants/change-tier');

/**
 * Admin override: change a tenant's tier.
 * Backend: POST /api/forex/admin/tenants/{tenant_id}/change-tier
 *
 * Body: { tier: 'free'|'micro'|'starter'|'pro'|'vip'|'dedicated', reason?: string }
 *
 * Use case: operator demote/promote tenant berdasarkan KYC review,
 * payment status, atau request customer.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ code: 'INVALID_PARAM', error: 'tenant_id required' }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: 'INVALID_JSON', error: 'Invalid JSON' }, { status: 400 });
  }

  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, `change-tier:${id}`);

  try {
    const res = await proxyToMasterBackend(
      'signals',
      `/api/forex/admin/tenants/${encodeURIComponent(id)}/change-tier`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      },
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`change-tier backend HTTP ${res.status} tenant=${id}`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
        },
        { status: res.status },
      );
    }
    return NextResponse.json({ source: 'backend', ...payload });
  } catch (err) {
    log.warn(`change-tier error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
