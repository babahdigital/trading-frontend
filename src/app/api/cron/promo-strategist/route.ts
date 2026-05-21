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

/** Auto-cleanup expired promos sebelum analyze new cycle.
 *  Pak Abdullah directive 2026-05-21: hapus 1-3 hari setelah event selesai
 *  (pilih 3 hari = grace untuk late-converts + customer follow-up).
 *
 *  Flow:
 *    1. ACTIVE yang endsAt < now → status EXPIRED (langsung, supaya popup
 *       berhenti tampil)
 *    2. EXPIRED yang endsAt < now - 3 days → DELETE (DB hygiene, no
 *       accumulation supaya admin queue tidak menumpuk)
 *
 *  Image file di /public/uploads/promotions/ tidak ikut di-purge (kept untuk
 *  audit + bisa di-restore manual kalau perlu). Separate sweep cron untuk
 *  orphan image deletion bisa di-tambah nanti kalau disk usage masalah.
 */
const POST_EVENT_GRACE_DAYS = 3;

async function cleanupExpiredPromos(): Promise<{ expired: number; purged: number }> {
  const now = new Date();
  const expiredResult = await prisma.promotion.updateMany({
    where: { status: 'ACTIVE', endsAt: { lt: now } },
    data: { status: 'EXPIRED' },
  });
  const purgeBefore = new Date(now.getTime() - POST_EVENT_GRACE_DAYS * 24 * 60 * 60 * 1000);
  const purgedResult = await prisma.promotion.deleteMany({
    where: { status: 'EXPIRED', endsAt: { lt: purgeBefore } },
  });
  return { expired: expiredResult.count, purged: purgedResult.count };
}

/** AI-powered copy generator via Claude Opus 4.7 (per Pak Abdullah:
 *  pakai AI terbaik, low frequency event-based). Fallback template kalau
 *  LLM unavailable. */
interface PromoCopy {
  popupTitle: string; popupTitle_en: string;
  popupBody: string; popupBody_en: string;
  ctaLabel: string; ctaLabel_en: string;
}

async function generatePromoCopy(args: {
  eventName?: string;
  eventTemplateKey?: string;
  action: 'greeting-only' | 'greeting-with-discount' | 'flash-sale';
  discountPercent?: number;
  applicableTiers: string[];
}): Promise<PromoCopy> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return fallbackCopy(args);

  const tierList = args.applicableTiers.length > 0 ? args.applicableTiers.join(', ') : 'semua tier';
  const discountLine = args.discountPercent ? `Diskon ${args.discountPercent}% untuk ${tierList}.` : 'No discount — focus brand engagement.';

  const userPrompt = `Generate marketing-grade JSON popup penawaran trading fintech BabahAlgo.

Konteks:
- Event: ${args.eventName ?? 'tidak ada event'} (template: ${args.eventTemplateKey ?? 'general'})
- Action: ${args.action}
- ${discountLine}
- Brand: BabahAlgo (zero-custody crypto bot, retail Indonesia + global)
- Tone: hangat, premium, jujur, NO hype, NO janji return

Output JSON:
{
  "popupTitle": "id, max 50 char",
  "popupTitle_en": "en, max 50 char",
  "popupBody": "id, max 180 char, 1-2 sentence persuasive",
  "popupBody_en": "en, max 180 char",
  "ctaLabel": "id, max 18 char",
  "ctaLabel_en": "en, max 18 char"
}

Rules:
- Greeting-only: warm wishes ONLY, NO discount mention
- Greeting+discount: wishes + discount mention proportional
- Flash-sale: clear urgency, real scarcity, NO toxic FOMO
- Indonesia native phrasing (bukan terjemahan kaku)
- NO ALL CAPS, NO excessive emoji, NO cliche

Output ONLY raw JSON (tanpa code fence, tanpa explanation).`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://babahalgo.com',
        'X-Title': 'BabahAlgo Promo Copy',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-opus-4-1',
        messages: [
          { role: 'system', content: 'You are a senior marketing copywriter for institutional fintech. Output JSON only.' },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!res.ok) { log.warn(`LLM copy HTTP ${res.status}`); return fallbackCopy(args); }
    const body = await res.json();
    const text: string = body.choices?.[0]?.message?.content ?? '';
    const cleaned = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as PromoCopy;
    if (!parsed.popupTitle || !parsed.popupBody) throw new Error('Missing fields');
    log.info(`Copy gen OK: "${parsed.popupTitle}"`);
    return parsed;
  } catch (err) {
    log.warn(`Copy gen failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return fallbackCopy(args);
  }
}

function fallbackCopy(args: { eventName?: string; action: string; discountPercent?: number }): PromoCopy {
  if (args.action === 'greeting-only' && args.eventName) {
    return {
      popupTitle: `Selamat ${args.eventName}`, popupTitle_en: `Happy ${args.eventName}`,
      popupBody: `Dari keluarga BabahAlgo, semoga ${args.eventName} membawa berkah untuk Anda.`,
      popupBody_en: `From the BabahAlgo family, may ${args.eventName} bring blessings to you.`,
      ctaLabel: 'Selamat Merayakan', ctaLabel_en: 'Celebrate',
    };
  }
  if (args.eventName) {
    return {
      popupTitle: `Spesial ${args.eventName}`, popupTitle_en: `${args.eventName} Special`,
      popupBody: `Diskon ${args.discountPercent ?? 15}% untuk tier crypto. Berkah ${args.eventName}.`,
      popupBody_en: `${args.discountPercent ?? 15}% off crypto tiers. ${args.eventName} blessing.`,
      ctaLabel: 'Lihat Penawaran', ctaLabel_en: 'See Offer',
    };
  }
  return {
    popupTitle: 'Flash Sale Terbatas', popupTitle_en: 'Limited Flash Sale',
    popupBody: `Diskon ${args.discountPercent ?? 20}% subscription crypto. Berlaku 48 jam.`,
    popupBody_en: `${args.discountPercent ?? 20}% off crypto subscription. 48 hours only.`,
    ctaLabel: 'Klaim Sekarang', ctaLabel_en: 'Claim Now',
  };
}

export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // 0. Auto-cleanup expired (status flip + DB purge > 90 days)
  const cleanup = await cleanupExpiredPromos();

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

    // Schedule window (Pak Abdullah directive 2026-05-21):
    //   - Lead window: 7 days SEBELUM event (atau per-event leadDays kalau lebih)
    //   - Promo endsAt: event_date + 3 days (grace post-event untuk late-converts)
    //   - Flash sale (no event): 7 days dari sekarang
    const startsAt = new Date();
    const endsAt = linkedEvent
      ? new Date(linkedEvent.eventDate.getTime() + POST_EVENT_GRACE_DAYS * 24 * 60 * 60 * 1000)
      : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Auto-activate kalau confidence high
    const status = decision.confidence >= 80 ? 'ACTIVE' : 'DRAFT';

    // AI-generated copy (Claude Opus, bilingual, marketing-grade)
    const copy = await generatePromoCopy({
      eventName: linkedEvent?.name,
      eventTemplateKey: linkedEvent?.templateKey,
      action: decision.action as 'greeting-only' | 'greeting-with-discount' | 'flash-sale',
      discountPercent: decision.discountPercent,
      applicableTiers: decision.applicableTiers,
    });

    try {
      const promo = await prisma.promotion.create({
        data: {
          slug: promoSlug.replace(/-+/g, '-').toLowerCase(),
          name: linkedEvent
            ? `Promo ${linkedEvent.name}`
            : decision.action === 'flash-sale'
              ? `Flash Sale ${new Date().toLocaleDateString('id-ID', { month: 'short', day: 'numeric' })}`
              : 'AI Auto-Promo',
          name_en: linkedEvent?.name_en ?? null,
          description: decision.reason,
          discountType: 'PERCENT',
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
          // LLM-generated copy (bilingual, marketing-grade)
          popupTitle: copy.popupTitle,
          popupTitle_en: copy.popupTitle_en,
          popupBody: copy.popupBody,
          popupBody_en: copy.popupBody_en,
          ctaLabel: copy.ctaLabel,
          ctaLabel_en: copy.ctaLabel_en,
          ctaLink: '/pricing',
        },
      });

      createdPromo = { id: promo.id, slug: promo.slug, status: promo.status };
      log.info(`Promotion created id=${promo.id} status=${promo.status} confidence=${decision.confidence}`);

      // Auto-trigger AI image gen untuk both locale (id + en). Fire-and-forget,
      // fail-soft — popup tetap muncul tanpa image kalau gen gagal.
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const cronSecret = process.env.CRON_SECRET ?? '';
      for (const loc of ['id', 'en'] as const) {
        fetch(`${baseUrl}/api/admin/cms/promotions/${promo.id}/generate-image?locale=${loc}`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(120_000),
        })
          .then((r) => r.ok ? log.info(`Auto image-gen ${loc} OK promoId=${promo.id}`) : log.warn(`Auto image-gen ${loc} HTTP ${r.status}`))
          .catch((e) => log.warn(`Auto image-gen ${loc} error: ${e instanceof Error ? e.message : 'unknown'}`));
      }
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
