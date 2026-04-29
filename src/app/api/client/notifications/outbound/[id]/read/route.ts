export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/notifications/outbound/read');

/**
 * Mark a single outbound notification as read.
 * Backend: POST /api/forex/me/notifications/outbound/{id}/read
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  const { id } = await params;
  if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
    return NextResponse.json(
      { code: 'INVALID_ID', error: 'Invalid notification id' },
      { status: 400 },
    );
  }

  try {
    const res = await proxyToMasterBackend(
      'signals',
      `/api/forex/me/notifications/outbound/${id}/read`,
      { method: 'POST' },
    );

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Mark-read backend HTTP ${res.status} for ${id}`);
      return NextResponse.json(
        {
          code: (payload as { code?: string }).code || 'BACKEND_FAILED',
          error: (payload as { error?: string }).error || 'backend_failed',
        },
        { status: res.status },
      );
    }

    return NextResponse.json(payload);
  } catch (err) {
    log.warn(`Mark-read error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
