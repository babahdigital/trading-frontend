export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/onboarding-status');

/**
 * Tenant onboarding 4-step checklist.
 * Backend: GET /api/forex/me/onboarding-status (Phase 14V)
 *
 * Response: { signup, mt5, equity_synced, pair_selected, completed_at? }
 *
 * Steps:
 *   1. signup            — selalu true (account created)
 *   2. mt5               — MT5 broker account linked + verified
 *   3. equity_synced     — first equity pull dari broker (~60s post-link)
 *   4. pair_selected     — at least 1 pair enabled di trading-config
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return NextResponse.json({ code: 'UNAUTHORIZED', error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await proxyToMasterBackend('signals', '/api/forex/me/onboarding-status', {
      method: 'GET',
    });

    const payload = await res.json().catch(() => ({}));
    if (!res.ok) {
      log.warn(`onboarding-status backend HTTP ${res.status}`);
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
    log.warn(`onboarding-status error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { code: 'BACKEND_UNREACHABLE', error: 'backend_unreachable' },
      { status: 503 },
    );
  }
}
