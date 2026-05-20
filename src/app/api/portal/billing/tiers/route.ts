import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { AUTH_COOKIE_NAMES } from '@/lib/auth/cookies';
import { verifyJwt } from '@/lib/auth/jwt';
import { prisma } from '@/lib/db/prisma';

// Reads cookies + DB. Force-dynamic so Next.js does not try to
// statically prerender this route at build time (DATABASE_URL is not
// available in the build container).
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Bridge status for the upgrade UI:
 *   - `linked`           customer is FE-logged-in AND has a valid forex
 *                        backend session (cookies set, /me returns 200).
 *   - `unlinked`         customer is FE-logged-in but has NO forex api_token
 *                        on their User row. Self-upgrade is impossible —
 *                        UI should show a "contact support to link account"
 *                        affordance.
 *   - `expired`          customer is FE-logged-in, HAS an api_token, but
 *                        the backend session expired and the bridge needs
 *                        a fresh login.
 *   - `not_authenticated` no FE session at all.
 */
type BridgeStatus = 'linked' | 'unlinked' | 'expired' | 'not_authenticated';
import { ensureForexAccessToken } from '@/lib/forex/session';
import { forexMe } from '@/lib/forex/me';
import { ForexApiError } from '@/lib/forex/types';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/portal/billing/tiers');

/**
 * GET /api/portal/billing/tiers — dynamic upgrade-able tier catalogue.
 *
 * Source of truth:
 *   - PricingTier table (CMS-editable: name, subtitle, features, CTA)
 *   - Mapped to backend forex tier slugs via a `forexTier` derived field
 *
 * The endpoint also stamps `currentTier` (from /api/forex/me) and a
 * boolean `upgradeableSlugs` whitelist so the FE never has to know the
 * backend's price book — every tier the customer can upgrade to is
 * generated server-side from DB + backend state.
 */

const UPGRADEABLE_BACKEND_TIERS = ['starter', 'pro', 'vip', 'dedicated'] as const;
type BackendTier = typeof UPGRADEABLE_BACKEND_TIERS[number];

const TIER_RANK: Record<string, number> = {
  anonymous: 0, beta: 0, free: 0, micro: 0,
  starter: 1, pro: 2, vip: 3, dedicated: 4,
};

/**
 * Map a CMS-managed PricingTier slug to the backend tier identifier the
 * upgrade endpoint expects. Returns null when the slug is not
 * checkout-able (crypto/vps/institutional tiers go through different
 * flows — VPS via contact-sales, crypto via the crypto backend).
 */
function deriveForexTier(slug: string): BackendTier | null {
  const lower = slug.toLowerCase();
  // Convention: `signal-{tier}` maps 1:1 to backend slug.
  if (lower.startsWith('signal-')) {
    const candidate = lower.slice('signal-'.length);
    if ((UPGRADEABLE_BACKEND_TIERS as readonly string[]).includes(candidate)) {
      return candidate as BackendTier;
    }
  }
  // Also accept raw backend names for forward-compat (e.g. admin seeds
  // a row with slug `pro` directly).
  if ((UPGRADEABLE_BACKEND_TIERS as readonly string[]).includes(lower)) {
    return lower as BackendTier;
  }
  return null;
}

function deriveIconKey(forexTier: BackendTier): string {
  const map: Record<BackendTier, string> = {
    starter: 'shield-check',
    pro: 'zap',
    vip: 'sparkles',
    dedicated: 'badge-check',
  };
  return map[forexTier];
}

export async function GET() {
  let currentTier: string | null = null;
  let bridgeStatus: BridgeStatus = 'not_authenticated';

  // Resolve FE session first so we can distinguish "no FE login" from
  // "FE login but no forex bridge linked".
  const jar = await cookies();
  const accessJwt = jar.get(AUTH_COOKIE_NAMES.ACCESS_TOKEN)?.value;
  let feUserId: string | null = null;
  if (accessJwt) {
    const claims = await verifyJwt(accessJwt);
    feUserId = claims?.sub ?? null;
  }

  if (feUserId) {
    bridgeStatus = 'expired';
    try {
      const session = await ensureForexAccessToken();
      if (session) {
        const me = await forexMe({ accessToken: session.accessToken });
        currentTier = me.tier;
        bridgeStatus = 'linked';
      } else {
        const user = await prisma.user.findUnique({
          where: { id: feUserId },
          select: { forexApiToken: true },
        });
        bridgeStatus = user?.forexApiToken ? 'expired' : 'unlinked';
      }
    } catch (err) {
      if (err instanceof ForexApiError) {
        log.info(`me lookup failed during tiers fetch: ${err.code}`);
      } else {
        log.error('unexpected me lookup error', err);
      }
    }
  }

  const rows = await prisma.pricingTier.findMany({
    where: { isVisible: true },
    orderBy: { sortOrder: 'asc' },
  });

  const tiers = rows
    .map((row) => {
      const forexTier = deriveForexTier(row.slug);
      return {
        slug: row.slug,
        forexTier,
        upgradeable: forexTier !== null,
        rank: forexTier ? TIER_RANK[forexTier] ?? 99 : 99,
        iconKey: forexTier ? deriveIconKey(forexTier) : 'package',
        priceLabel: row.price,
        name: { id: row.name, en: row.name_en || row.name },
        subtitle: { id: row.subtitle ?? '', en: row.subtitle_en ?? row.subtitle ?? '' },
        features: {
          id: Array.isArray(row.features) ? row.features : [],
          en: Array.isArray(row.features_en) ? row.features_en : Array.isArray(row.features) ? row.features : [],
        },
        cta: {
          label: { id: row.ctaLabel, en: row.ctaLabel_en || row.ctaLabel },
          link: row.ctaLink,
        },
      };
    })
    .filter((t) => t.upgradeable)
    .sort((a, b) => a.rank - b.rank);

  return NextResponse.json({
    ok: true,
    bridgeStatus,
    currentTier,
    currentTierRank: currentTier ? TIER_RANK[currentTier.toLowerCase()] ?? 0 : null,
    tiers,
  });
}
