/**
 * FE proxy untuk POST /api/tenants/{id}/notifications/log/{logId}/read.
 *
 * Backend rc26+ — mark notification as read. Idempotent: backend preserve
 * first read_at timestamp, kedua call return 200 tanpa update.
 *
 * Auth: scope='keys' (tenant-scoped), X-Tenant-Id wajib.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToCryptoBackend, cryptoBackendConfigured } from '@/lib/proxy/crypto-client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: logId } = await params;
  if (!logId || !/^\d+$/.test(logId)) {
    return NextResponse.json({ error: 'invalid_log_id' }, { status: 400 });
  }

  if (!cryptoBackendConfigured()) {
    return NextResponse.json({ ok: true, source: 'unconfigured' }, { status: 200 });
  }

  const res = await proxyToCryptoBackend({
    scope: 'keys',
    path: `/api/tenants/${encodeURIComponent(userId)}/notifications/log/${encodeURIComponent(logId)}/read`,
    method: 'POST',
    forwardUserId: userId,
    tenantId: userId,
    timeoutMs: 5_000,
  });

  if (!res.ok) {
    // 404 sebelum rc26 deploy — silently OK supaya FE bisa fire-forget.
    if (res.status === 404) {
      return NextResponse.json({ ok: true, source: 'not_ready' }, { status: 200 });
    }
    return NextResponse.json(
      { error: 'backend_error', status: res.status },
      { status: res.status },
    );
  }

  const data = await res.json().catch(() => ({}));
  return NextResponse.json({ ok: true, ...data });
}
