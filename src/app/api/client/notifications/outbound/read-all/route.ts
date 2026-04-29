export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/notifications/outbound/read-all');

/**
 * Mark all outbound notifications as read for the authenticated tenant.
 * Backend: POST /api/forex/me/notifications/outbound/read-all
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json(
      { code: 'UNAUTHORIZED', error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    const res = await proxyToMasterBackend(
      'signals',
      '/api/forex/me/notifications/outbound/read-all',
      { method: 'POST' },
    );

    const payload = await res.json().catch(() => ({}));

    if (!res.ok) {
      log.warn(`Read-all backend HTTP ${res.status}`);
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
    log.warn(`Read-all error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
