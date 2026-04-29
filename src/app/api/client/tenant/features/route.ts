export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { resolveIdempotencyKey } from '@/lib/api/idempotency';
import { toCapabilityTier } from '@/lib/capabilities/tier-mapping';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/tenant/features');

/**
 * Per-tenant effective feature state per CAPABILITIES_API_GUIDE §1.2 + §1.3.
 *
 * GET — return tenant's currently-enabled features given tier + override toggles.
 * PUT — toggle individual features within tier. Returns 403 with TIER_FORBIDDEN
 *       when user tries to enable a feature above their tier.
 *
 * Backend path: /v1/tenant/me/features (X-API-Token authed via 'signals' scope).
 * Local fallback: synthesize from /api/client/capabilities + user's subscription tier.
 */

interface FeatureItem {
  name: string;
  category: 'indicator' | 'strategy' | 'ai_subsystem';
  enabled: boolean;
  tier_allows: boolean;
  requires_tier: 'beta' | 'starter' | 'pro' | 'vip' | 'dedicated';
  description: string;
}

interface TenantFeaturesResponse {
  tenant_id: string;
  tier: 'beta' | 'starter' | 'pro' | 'vip' | 'dedicated';
  indicators: FeatureItem[];
  strategies: FeatureItem[];
  ai_subsystems: FeatureItem[];
}

const PutBody = z.object({
  indicators: z.record(z.boolean()).optional(),
  strategies: z.record(z.boolean()).optional(),
  ai_subsystems: z.record(z.boolean()).optional(),
}).strict();

async function resolveUserContext(request: NextRequest): Promise<
  | { ok: true; userId: string; subscriptionTier: string | null; licenseType: string | null }
  | { ok: false; response: NextResponse }
> {
  const userId = request.headers.get('x-user-id');
  if (!userId) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: { where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' }, take: 1 },
      licenses: { where: { status: 'ACTIVE' }, orderBy: { startsAt: 'desc' }, take: 1 },
    },
  });
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'User not found' }, { status: 404 }) };
  }
  return {
    ok: true,
    userId,
    subscriptionTier: user.subscriptions[0]?.tier ?? null,
    licenseType: user.licenses[0]?.type ?? null,
  };
}

async function getCatalog(): Promise<{
  indicators: { name: string; category: 'indicator'; available_in_tier: FeatureItem['requires_tier']; description: string }[];
  strategies: { name: string; category: 'strategy'; available_in_tier: FeatureItem['requires_tier']; description: string }[];
  ai_subsystems: { name: string; category: 'ai_subsystem'; available_in_tier: FeatureItem['requires_tier']; description: string }[];
}> {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  try {
    const res = await fetch(`${base}/api/public/capabilities`, { cache: 'no-store' });
    if (res.ok) {
      const body = await res.json();
      return body;
    }
  } catch { /* fall through */ }
  return { indicators: [], strategies: [], ai_subsystems: [] };
}

const TIER_ORDER = ['beta', 'starter', 'pro', 'vip', 'dedicated'] as const;
function tierIncludes(currentTier: string, requiredTier: string): boolean {
  return TIER_ORDER.indexOf(currentTier as (typeof TIER_ORDER)[number])
    >= TIER_ORDER.indexOf(requiredTier as (typeof TIER_ORDER)[number]);
}

async function buildLocalFallback(
  userId: string,
  tier: FeatureItem['requires_tier'],
  overrides: { indicators: Record<string, boolean>; strategies: Record<string, boolean>; ai_subsystems: Record<string, boolean> },
): Promise<TenantFeaturesResponse> {
  const catalog = await getCatalog();
  const map = <C extends 'indicator' | 'strategy' | 'ai_subsystem'>(
    items: { name: string; category: C; available_in_tier: FeatureItem['requires_tier']; description: string }[],
    bucket: 'indicators' | 'strategies' | 'ai_subsystems',
  ): FeatureItem[] =>
    items.map((it) => {
      const allows = tierIncludes(tier, it.available_in_tier);
      const override = overrides[bucket][it.name];
      const enabled = allows && (override === undefined ? true : override);
      return {
        name: it.name,
        category: it.category,
        enabled,
        tier_allows: allows,
        requires_tier: it.available_in_tier,
        description: it.description,
      };
    });

  return {
    tenant_id: userId,
    tier,
    indicators: map(catalog.indicators, 'indicators'),
    strategies: map(catalog.strategies, 'strategies'),
    ai_subsystems: map(catalog.ai_subsystems, 'ai_subsystems'),
  };
}

export async function GET(request: NextRequest) {
  const ctx = await resolveUserContext(request);
  if (!ctx.ok) return ctx.response;

  const tier = toCapabilityTier(ctx.subscriptionTier, ctx.licenseType);

  // Try master backend first
  try {
    const res = await proxyToMasterBackend('signals', '/v1/tenant/me/features', { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      return NextResponse.json({ source: 'backend', ...body });
    }
    log.warn(`Tenant features backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Tenant features error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Local fallback — read overrides from user metadata kalau ada
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    include: { subscriptions: { where: { status: 'ACTIVE' }, take: 1 } },
  });
  const overrides = (user?.subscriptions[0]?.metadata as { features?: { indicators?: Record<string, boolean>; strategies?: Record<string, boolean>; ai_subsystems?: Record<string, boolean> } } | null)?.features ?? {};
  const fallback = await buildLocalFallback(ctx.userId, tier, {
    indicators: overrides.indicators ?? {},
    strategies: overrides.strategies ?? {},
    ai_subsystems: overrides.ai_subsystems ?? {},
  });
  return NextResponse.json({ source: 'fallback', ...fallback });
}

export async function PUT(request: NextRequest) {
  const ctx = await resolveUserContext(request);
  if (!ctx.ok) return ctx.response;

  let body: z.infer<typeof PutBody>;
  try {
    body = PutBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const tier = toCapabilityTier(ctx.subscriptionTier, ctx.licenseType);

  const { key: idempotencyKey } = resolveIdempotencyKey(request.headers, 'features');

  // Try master backend first — it owns the authoritative gate
  try {
    const res = await proxyToMasterBackend('signals', '/v1/tenant/me/features', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(body),
    });
    if (res.status === 403) {
      const errBody = await res.json().catch(() => ({}));
      return NextResponse.json(errBody, { status: 403 });
    }
    if (res.ok) {
      const updated = await res.json();
      return NextResponse.json({ source: 'backend', ...updated });
    }
    log.warn(`Tenant features PUT backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Tenant features PUT error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Local fallback — enforce tier gate, persist to subscription.metadata
  const catalog = await getCatalog();
  const allItems = [
    ...catalog.indicators.map((i) => ({ ...i, bucket: 'indicators' as const })),
    ...catalog.strategies.map((i) => ({ ...i, bucket: 'strategies' as const })),
    ...catalog.ai_subsystems.map((i) => ({ ...i, bucket: 'ai_subsystems' as const })),
  ];

  // Validate every requested toggle against tier gate
  const incoming = {
    indicators: body.indicators ?? {},
    strategies: body.strategies ?? {},
    ai_subsystems: body.ai_subsystems ?? {},
  };
  for (const [bucket, toggles] of Object.entries(incoming) as [keyof typeof incoming, Record<string, boolean>][]) {
    for (const [name, desired] of Object.entries(toggles)) {
      if (desired) {
        const item = allItems.find((it) => it.bucket === bucket && it.name === name);
        if (item && !tierIncludes(tier, item.available_in_tier)) {
          return NextResponse.json(
            {
              detail: {
                code: 'TIER_FORBIDDEN',
                feature: name,
                current_tier: tier,
                current_tier_rank: TIER_ORDER.indexOf(tier),
                requires_tier: item.available_in_tier,
              },
            },
            { status: 403 },
          );
        }
      }
    }
  }

  // Merge with existing overrides + persist
  const sub = await prisma.subscription.findFirst({
    where: { userId: ctx.userId, status: 'ACTIVE' },
    orderBy: { startsAt: 'desc' },
  });

  const existingMeta = (sub?.metadata as { features?: typeof incoming } | null) ?? {};
  const newOverrides = {
    indicators: { ...(existingMeta.features?.indicators ?? {}), ...incoming.indicators },
    strategies: { ...(existingMeta.features?.strategies ?? {}), ...incoming.strategies },
    ai_subsystems: { ...(existingMeta.features?.ai_subsystems ?? {}), ...incoming.ai_subsystems },
  };

  if (sub) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        metadata: {
          ...(typeof existingMeta === 'object' && existingMeta !== null ? existingMeta : {}),
          features: newOverrides,
        },
      },
    });
  }

  const fallback = await buildLocalFallback(ctx.userId, tier, newOverrides);
  return NextResponse.json({ source: 'fallback', ...fallback });
}
