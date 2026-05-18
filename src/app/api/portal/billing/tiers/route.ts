import { NextResponse } from 'next/server';

import { prisma } from '@/lib/db/prisma';
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
  try {
    const session = await ensureForexAccessToken();
    if (session) {
      const me = await forexMe({ accessToken: session.accessToken });
      currentTier = me.tier;
    }
  } catch (err) {
    if (err instanceof ForexApiError) {
      log.info(`me lookup failed during tiers fetch: ${err.code}`);
    } else {
      log.error('unexpected me lookup error', err);
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
    currentTier,
    currentTierRank: currentTier ? TIER_RANK[currentTier.toLowerCase()] ?? 0 : null,
    tiers,
  });
}
