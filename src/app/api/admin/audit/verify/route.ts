export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/audit/verify');

/**
 * Audit chain integrity check per backend-contract §6.11.
 * Returns `{status: "healthy"|"tampered", chain_length, broken_at_id, head, tail, verified_at}`.
 *
 * Tampered chain = production DB breach signal. Admin dashboard SHOULD
 * surface red banner alert when status !== 'healthy'.
 */
export async function GET(request: NextRequest) {
  const role = request.headers.get('x-user-role');
  if (role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const res = await proxyToMasterBackend('admin', '/api/forex/admin/audit/verify', { method: 'GET' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      log.warn(`Audit verify HTTP ${res.status}`);
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...body }, { status: res.status });
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', ...body });
  } catch (err) {
    log.warn(`Audit verify error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
