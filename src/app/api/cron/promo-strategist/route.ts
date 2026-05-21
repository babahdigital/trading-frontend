/**
 * AI Promo Strategist — autonomous decision engine.
 *
 * Daily cron (or manual trigger via admin):
 *   1. Compute revenue health snapshot (MRR + active sub + delta) → RevenueSnapshot
 *   2. Check upcoming CalendarEvent (next 14 days, by leadDays)
 *   3. LLM strategist decide:
 *      - Revenue STRONG + event nearby     → greeting-only popup
 *      - Revenue WEAK + event nearby       → greeting + discount
 *      - Revenue WEAK + no event           → flash-sale promo
 *      - Revenue STRONG + no event         → no-action
 *   4. Auto-create Promotion DRAFT atau SCHEDULED (kalau confidence >= 80, auto-ACTIVE)
 *   5. Generate AI image async (best-effort, tidak block decision)
 *
 * Auth: Bearer CRON_SECRET (set di env, sama dengan cron lain di project)
 * atau admin x-user-role.
 *
 * Logic deliberately SIMPLE — heuristic-driven baseline. Pluggable LLM call
 * untuk Phase 2 (real Claude/Gemini analysis dari richer revenue data).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/promo-strategist');

function authorize(request: NextRequest): boolean {
  // Admin role bypass
  if (request.headers.get('x-user-role') === 'ADMIN') return true;
  // Cron secret check
  const expected = process.env.CRON_SECRET;
  if (!expected) return false;
  const auth = request.headers.get('authorization') ?? '';
  return auth === `Bearer ${expected}`;
}

interface RevenueHealth {
  mrrIdr: number;
  activeSubscribers: number;
  newSignups24h: number;
  churned24h: number;
  healthScore: number;
  trend7d: 'up' | 'flat' | 'down';
}

/**
 * Compute revenue snapshot + health score (0-100).
 *
 * Algorithm:
 *   - Base score 50
 *   - MRR delta 7-day: > +10% → +20, > +3% → +10, flat → 0, -10% → -15, -25% → -30
 *   - Active subscriber count: > 100 → +10, > 50 → +5
 *   - Net signup-vs-churn (24h): positive → +5, negative → -10
 *   - Cap 0-100
 */
async function computeRevenueHealth(): Promise<RevenueHealth> {
  // Active subscriptions current
  const activeSubs = await prisma.subscription.count({
    where: { status: 'ACTIVE' },
  });

  // MRR — sum monthly fee
  const subs = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    select: { monthlyFeeUsd: true },
  });
  const mrrUsd = subs.reduce((sum, s) => sum + Number(s.monthlyFeeUsd ?? 0), 0);
  const mrrIdr = Math.round(mrrUsd * 16_500); // approximate USD→IDR

  // Last 24h signups
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newSignups = await prisma.subscription.count({
    where: { createdAt: { gte: since24h } },
  });

  // Last 24h churned — Subscription model tidak ada updatedAt, gunakan
  // proxy: cancelledAt di metadata JSON (set di cancelSubscription helper).
  // Fallback approximate: count expired subs dengan expiresAt < now AND createdAt
  // > since24h (recent record yang baru expire — kasus edge tapi safer).
  const churned = await prisma.subscription.count({
    where: {
      status: { in: ['CANCELLED', 'EXPIRED'] },
      expiresAt: { gte: since24h },
    },
  });

  // 7-day trend — compare with snapshot 7 days ago
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  since7d.setUTCHours(0, 0, 0, 0);
  const snap7d = await prisma.revenueSnapshot.findFirst({
    where: { snapshotDate: { lte: since7d } },
    orderBy: { snapshotDate: 'desc' },
  });
  let trend7d: 'up' | 'flat' | 'down' = 'flat';
  let deltaPct = 0;
  if (snap7d) {
    const prev = Number(snap7d.mrrIdr);
    if (prev > 0) {
      deltaPct = ((mrrIdr - prev) / prev) * 100;
      if (deltaPct > 3) trend7d = 'up';
      else if (deltaPct < -3) trend7d = 'down';
    }
  }

  // Compute score
  let score = 50;
  if (deltaPct > 10) score += 20;
  else if (deltaPct > 3) score += 10;
  else if (deltaPct < -25) score -= 30;
  else if (deltaPct < -10) score -= 15;

  if (activeSubs > 100) score += 10;
  else if (activeSubs > 50) score += 5;

  const netSignups = newSignups - churned;
  if (netSignups > 0) score += 5;
  else if (netSignups < 0) score -= 10;

  score = Math.max(0, Math.min(100, score));

  return { mrrIdr, activeSubscribers: activeSubs, newSignups24h: newSignups, churned24h: churned, healthScore: score, trend7d };
}

interface StrategistDecision {
  action: 'greeting-only' | 'greeting-with-discount' | 'flash-sale' | 'no-action';
  reason: string;
  discountPercent?: number;
  applicableTiers: string[];
  confidence: number;
  linkedEventSlug?: string;
}

/** Heuristic strategist — deterministic decision dari health + upcoming events.
 *  Pluggable: Phase 2 swap dengan LLM call untuk lebih nuanced reasoning. */
function decideStrategy(
  health: RevenueHealth,
  upcomingEvents: Array<{ slug: string; daysAway: number }>,
): StrategistDecision {
  const nearestEvent = upcomingEvents[0];
  const eventNearby = nearestEvent && nearestEvent.daysAway <= 14;

  // Decision matrix
  if (eventNearby && health.healthScore >= 70) {
    // Strong revenue + event → greeting only (brand engagement, no discount needed)
    return {
      action: 'greeting-only',
      reason: `Health ${health.healthScore} strong, ${nearestEvent.slug} in ${nearestEvent.daysAway}d — brand engagement greeting`,
      applicableTiers: [],
      confidence: 80,
      linkedEventSlug: nearestEvent.slug,
    };
  }

  if (eventNearby && health.healthScore < 70) {
    // Soft revenue + event → greeting WITH discount (conversion boost)
    const discountPct = health.healthScore < 40 ? 25 : 15;
    return {
      action: 'greeting-with-discount',
      reason: `Health ${health.healthScore} soft, ${nearestEvent.slug} in ${nearestEvent.daysAway}d — festive discount ${discountPct}%`,
      discountPercent: discountPct,
      applicableTiers: ['crypto-starter', 'crypto-active', 'crypto-pro'],
      confidence: 75,
      linkedEventSlug: nearestEvent.slug,
    };
  }

  if (!eventNearby && health.healthScore < 40) {
    // Weak revenue + no event → flash sale (urgency-driven)
    return {
      action: 'flash-sale',
      reason: `Health ${health.healthScore} weak, no event scheduled — flash sale 20% off`,
      discountPercent: 20,
      applicableTiers: ['crypto-starter', 'crypto-active'],
      confidence: 65,
    };
  }

  // Default: no-action (revenue healthy, no event)
  return {
    action: 'no-action',
    reason: `Health ${health.healthScore} acceptable, no event nearby — no promo needed`,
    applicableTiers: [],
    confidence: 90,
  };
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 1. Compute revenue health + write snapshot (1 row per day)
  const health = await computeRevenueHealth();
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  await prisma.revenueSnapshot.upsert({
    where: { snapshotDate: today },
    create: {
      snapshotDate: today,
      mrrIdr: BigInt(health.mrrIdr),
      activeSubscribers: health.activeSubscribers,
      newSignups24h: health.newSignups24h,
      churned24h: health.churned24h,
      healthScore: health.healthScore,
      notes: { trend7d: health.trend7d },
    },
    update: {
      mrrIdr: BigInt(health.mrrIdr),
      activeSubscribers: health.activeSubscribers,
      newSignups24h: health.newSignups24h,
      churned24h: health.churned24h,
      healthScore: health.healthScore,
      notes: { trend7d: health.trend7d },
    },
  });

  // 2. Resolve upcoming events (next 14 days, leadDays-aware)
  const horizon = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const upcomingEvents = await prisma.calendarEvent.findMany({
    where: {
      isActive: true,
      eventDate: { gte: new Date(), lte: horizon },
    },
    orderBy: { eventDate: 'asc' },
  });

  const eventsByDays = upcomingEvents
    .map((e) => ({
      slug: e.slug,
      daysAway: Math.ceil((e.eventDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)),
      leadDays: e.leadDays,
      eventRecord: e,
    }))
    .filter((e) => e.daysAway <= e.leadDays); // hanya yang sudah masuk lead window

  // 3. Strategist decision
  const decision = decideStrategy(health, eventsByDays);

  log.info(`Strategist: health=${health.healthScore} trend=${health.trend7d} action=${decision.action} confidence=${decision.confidence}`);

  // 4. Auto-create Promotion DRAFT (kalau action != no-action)
  let createdPromo: { id: string; slug: string; status: string } | null = null;
  if (decision.action !== 'no-action') {
    const linkedEvent = decision.linkedEventSlug
      ? eventsByDays.find((e) => e.slug === decision.linkedEventSlug)?.eventRecord ?? null
      : null;

    const promoSlug = linkedEvent
      ? `${linkedEvent.slug}-auto-${Date.now()}`
      : `flash-${Date.now()}`;

    // Schedule window — start now, end at event date + 1 day, atau 7 days kalau flash
    const startsAt = new Date();
    const endsAt = linkedEvent
      ? new Date(linkedEvent.eventDate.getTime() + 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Auto-activate kalau confidence high
    const status = decision.confidence >= 80 ? 'ACTIVE' : 'DRAFT';

    try {
      const promo = await prisma.promotion.create({
        data: {
          slug: promoSlug.replace(/-+/g, '-').toLowerCase(),
          name: linkedEvent
            ? `Promo ${linkedEvent.name}`
            : decision.action === 'flash-sale'
              ? `Flash Sale ${new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}`
              : 'AI Auto-Promo',
          description: decision.reason,
          discountType: decision.discountPercent ? 'PERCENT' : 'PERCENT',
          discountValue: new Prisma.Decimal(decision.discountPercent ?? 0),
          applicableTiers: decision.applicableTiers,
          startsAt,
          endsAt,
          status,
          aiGenerated: true,
          aiContext: {
            healthScore: health.healthScore,
            trend7d: health.trend7d,
            activeSubscribers: health.activeSubscribers,
            decisionAction: decision.action,
            decisionReason: decision.reason,
            discountPercent: decision.discountPercent ?? null,
            applicableTiers: decision.applicableTiers,
            confidence: decision.confidence,
            linkedEventSlug: decision.linkedEventSlug ?? null,
          } as Prisma.InputJsonValue,
          confidence: decision.confidence,
          calendarEventId: linkedEvent?.id ?? null,
          // Popup defaults — admin can edit before publish
          popupTitle: linkedEvent ? `Selamat ${linkedEvent.name}` : 'Penawaran Spesial',
          popupBody: decision.action === 'greeting-only'
            ? `Dari keluarga BabahAlgo, kami ucapkan ${linkedEvent?.name ?? 'salam'} — semoga tradin Anda berkah dan profitable.`
            : `Spesial ${linkedEvent?.name ?? 'penawaran'}: diskon ${decision.discountPercent}% untuk berlangganan tier crypto. Berlaku terbatas hingga ${endsAt.toLocaleDateString('id-ID')}.`,
          ctaLabel: 'Lihat Penawaran',
          ctaLink: '/pricing',
        },
      });

      createdPromo = { id: promo.id, slug: promo.slug, status: promo.status };
      log.info(`Promotion created id=${promo.id} status=${promo.status} confidence=${decision.confidence}`);
    } catch (err) {
      log.error(`Failed to create promotion: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  return NextResponse.json({
    ok: true,
    health,
    decision,
    upcomingEvents: eventsByDays.map((e) => ({ slug: e.slug, daysAway: e.daysAway })),
    createdPromo,
  });
}

// GET handler — manual trigger via admin UI (sama logic, no body)
export async function GET(request: NextRequest) {
  return POST(request);
}
