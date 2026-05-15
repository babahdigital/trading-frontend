export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/tenants/engines');

/**
 * Admin override: granular set tenant trading engines.
 * Backend: PATCH /api/forex/admin/tenants/{tenant_id}/engines
 * (Phase 14V Wave 2.5 TASK 94 — shipped 2026-05-15)
 *
 * Body: { engines: string[], reason: string }
 *   engines ∈ subset dari `['scalper', 'swing']`
 *
 * Use case: customer minta scalper-only sementara karena risk reset,
 * atau operator emergency disable engine tanpa change-tier penuh
 * (suspend = drop all, change-tier = restart tier policy, engines = surgical).
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, `engines:${id}`);

  try {
    const res = await proxyToMasterBackend(
      'admin',
      `/api/forex/admin/tenants/${encodeURIComponent(id)}/engines`,
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(body),
      },
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`engines backend HTTP ${res.status} tenant=${id}`);
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
    log.warn(`engines error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
