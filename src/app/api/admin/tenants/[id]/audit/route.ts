export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/tenants/audit');

/**
 * Per-tenant audit feed (BACKEND P2 — Phase 14W pending per API_INTEGRATION_GUIDE §9).
 *
 * Backend (when ship): GET /api/forex/admin/tenants/{tenant_id}/audit
 *   query: limit, cursor
 *   response: { entries[]{actor, event_type, payload, ts}, total, next_cursor }
 *
 * FE-side ini SUDAH READY — saat backend ship endpoint, langsung jalan tanpa
 * perubahan FE. Saat ini backend return 404, FE graceful degrade ke empty state.
 *
 * Use case: admin/customers/{id} detail page → timeline aksi tenant (suspend,
 * change-tier, kill-switch trigger, engines override) untuk dispute resolution
 * + compliance audit chain.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ code: 'INVALID_PARAM', error: 'tenant_id required' }, { status: 400 });
  }

  const url = new URL(request.url);
  const qs = new URLSearchParams();
  const limit = url.searchParams.get('limit') || '50';
  const cursor = url.searchParams.get('cursor');
  qs.set('limit', limit);
  if (cursor) qs.set('cursor', cursor);

  try {
    const res = await proxyToMasterBackend(
      'admin',
      `/api/forex/admin/tenants/${encodeURIComponent(id)}/audit?${qs.toString()}`,
      { method: 'GET' },
    );

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Backend belum ship — FE soft-fail ke empty state, jangan throw
      if (res.status === 404 || res.status === 501) {
        return NextResponse.json({
          source: 'pending',
          entries: [],
          total: 0,
          next_cursor: null,
          message: 'Backend endpoint Phase 14W belum ship — FE siap consume otomatis saat live.',
        });
      }
      log.warn(`audit feed backend HTTP ${res.status} tenant=${id}`);
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
    log.warn(`audit feed error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      {
        source: 'unreachable',
        entries: [],
        total: 0,
        next_cursor: null,
        message: 'Backend unreachable — retry kemudian.',
      },
      { status: 200 }, // jangan break admin UI, render empty
    );
  }
}
