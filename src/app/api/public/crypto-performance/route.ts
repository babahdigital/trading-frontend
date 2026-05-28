import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Public master-tenant crypto performance — mirror of /api/public/performance
 * (forex). Guest-accessible, returns { source, equity, kpi } with NO auth.
 *
 * The public /performance/crypto hub previously fetched the auth-gated
 * /api/crypto/portfolio, which 401s for guests and never returns equity/kpi —
 * so the page was permanently stuck on its "pending" state and logged a 401 for
 * every visitor. (P1-DI-2)
 *
 * ESCALATION: the crypto backend does not yet expose master-tenant aggregate
 * equity/KPI on an unauthenticated public surface (per crypto backend v0.8 —
 * /api/tenants/* all require X-Tenant-Id + scoped token). Until it does, this
 * endpoint returns an honest `pending` payload (no fabricated numbers); the hub
 * renders its "coming soon" state. When the backend ships a public master-tenant
 * crypto-performance feed, wire it here — the hub already consumes { equity, kpi }.
 */
export async function GET() {
  return NextResponse.json(
    {
      source: 'pending',
      equity: [],
      kpi: null,
    },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' } },
  );
}
