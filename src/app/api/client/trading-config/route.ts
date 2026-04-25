export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/trading-config');

/**
 * Read tenant trading config (notification_lang, trading toggles, AI prefs).
 * Per backend-contract §6.12.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/trading-config', { method: 'GET' });
    if (!res.ok) {
      log.warn(`Trading config backend HTTP ${res.status}`);
      const body = await res.json().catch(() => ({}));
      return NextResponse.json({ error: 'backend_failed', status: res.status, ...body }, { status: res.status });
    }
    const body = await res.json();
    return NextResponse.json({ source: 'backend', ...body });
  } catch (err) {
    log.warn(`Trading config error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'backend_unreachable' }, { status: 503 });
  }
}
