/**
 * GET /api/v1/recommend-tier?equity=N
 *
 * Server-side mirror of `lib/crypto/recommend-tier` pure function — supaya
 * backend-validate scenarios (drip campaign, signup gate, audit) bisa
 * call endpoint instead of duplicating logic.
 *
 * Spec rc29 (per memory reference_recommend_tier_endpoint_spec.md):
 *   - <$500       → free_demo
 *   - $500-1.5K   → starter
 *   - $1.5K-5K    → active
 *   - $5K-25K     → pro
 *   - ≥$25K       → hnwi
 *
 * Public endpoint — no auth required (used pre-signup di onboarding wizard).
 * Cache 5 min CDN (pure function, idempotent), 1 hour stale-while-revalidate.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { recommendTier } from '@/lib/crypto/recommend-tier';

export async function GET(req: NextRequest) {
  const equityParam = req.nextUrl.searchParams.get('equity');
  if (!equityParam) {
    return NextResponse.json(
      { error: 'missing_equity', message: 'Query param `equity` required (numeric USDT amount)' },
      { status: 400 },
    );
  }
  const equity = Number(equityParam);
  if (!Number.isFinite(equity) || equity < 0) {
    return NextResponse.json(
      { error: 'invalid_equity', message: '`equity` must be non-negative finite number' },
      { status: 400 },
    );
  }

  const recommendation = recommendTier(equity);

  return NextResponse.json(
    { ok: true, equity, recommendation },
    {
      headers: {
        // Pure function — aggressive cache OK.
        'Cache-Control': 'public, max-age=300, s-maxage=300, stale-while-revalidate=3600',
      },
    },
  );
}
