/**
 * Admin analytics summary.
 *
 * 2026-05-20 — Phase A polish. Surface funnel + web vitals + top pages
 * untuk admin dashboard PMF measurement. Query langsung dari
 * AnalyticsEvent table (single source, no third-party).
 *
 * Default window: last 7 days. Override via ?days=30 (max 90).
 * Auth: middleware sudah enforce admin role di /api/admin/* prefix.
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const log = createLogger('api/admin/analytics/summary');

export async function GET(request: NextRequest) {
  const daysParam = parseInt(request.nextUrl.searchParams.get('days') ?? '7', 10);
  const days = Math.min(Math.max(Number.isFinite(daysParam) ? daysParam : 7, 1), 90);
  const since = new Date(Date.now() - days * 86400 * 1000);

  try {
    // Funnel counts — distinct sessionId per event type within window
    const [
      pageviews,
      registerStarts,
      registerSteps,
      registerCompletes,
      checkoutStarts,
      checkoutSuccess,
    ] = await Promise.all([
      prisma.analyticsEvent.count({ where: { eventType: 'pageview', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'register_start', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'register_step', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'register_complete', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'checkout_start', createdAt: { gte: since } } }),
      prisma.analyticsEvent.count({ where: { eventType: 'checkout_success', createdAt: { gte: since } } }),
    ]);

    // Unique sessions (rough DAU proxy)
    const uniqueSessions = await prisma.analyticsEvent.findMany({
      where: { createdAt: { gte: since }, sessionId: { not: null } },
      distinct: ['sessionId'],
      select: { sessionId: true },
    });

    // Top pages — group by path
    const topPagesRaw = await prisma.$queryRaw<Array<{ path: string; cnt: bigint }>>`
      SELECT "path", COUNT(*)::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE "eventType" = 'pageview'
        AND "createdAt" >= ${since}
        AND "path" IS NOT NULL
      GROUP BY "path"
      ORDER BY cnt DESC
      LIMIT 10
    `;
    const topPages = topPagesRaw.map((r) => ({ path: r.path, count: Number(r.cnt) }));

    // Country breakdown
    const countryRaw = await prisma.$queryRaw<Array<{ country: string; cnt: bigint }>>`
      SELECT "country", COUNT(*)::bigint AS cnt
      FROM "AnalyticsEvent"
      WHERE "createdAt" >= ${since} AND "country" IS NOT NULL
      GROUP BY "country"
      ORDER BY cnt DESC
      LIMIT 10
    `;
    const topCountries = countryRaw.map((r) => ({ country: r.country, count: Number(r.cnt) }));

    // Web Vitals p75 — kalau ada engagement events
    const lcpEvents = await prisma.$queryRaw<Array<{ p75: number | null }>>`
      SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ("metadata"->>'value_ms')::numeric) AS p75
      FROM "AnalyticsEvent"
      WHERE "eventType" = 'engagement'
        AND "metadata"->>'vital' = 'LCP'
        AND "createdAt" >= ${since}
    `;
    const fcpEvents = await prisma.$queryRaw<Array<{ p75: number | null }>>`
      SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ("metadata"->>'value_ms')::numeric) AS p75
      FROM "AnalyticsEvent"
      WHERE "eventType" = 'engagement'
        AND "metadata"->>'vital' = 'FCP'
        AND "createdAt" >= ${since}
    `;
    const clsEvents = await prisma.$queryRaw<Array<{ p75: number | null }>>`
      SELECT PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ("metadata"->>'value_score')::numeric) AS p75
      FROM "AnalyticsEvent"
      WHERE "eventType" = 'engagement'
        AND "metadata"->>'vital' = 'CLS'
        AND "createdAt" >= ${since}
    `;

    return NextResponse.json({
      windowDays: days,
      uniqueSessions: uniqueSessions.length,
      pageviews,
      funnel: {
        registerStarts,
        registerSteps,
        registerCompletes,
        checkoutStarts,
        checkoutSuccess,
        conversionRate: pageviews > 0
          ? Math.round((registerCompletes / pageviews) * 10000) / 100
          : 0,
      },
      topPages,
      topCountries,
      webVitals: {
        lcp_p75_ms: lcpEvents[0]?.p75 != null ? Math.round(Number(lcpEvents[0].p75)) : null,
        fcp_p75_ms: fcpEvents[0]?.p75 != null ? Math.round(Number(fcpEvents[0].p75)) : null,
        cls_p75_score: clsEvents[0]?.p75 != null ? Math.round(Number(clsEvents[0].p75) * 1000) / 1000 : null,
      },
    });
  } catch (err) {
    log.error(`analytics summary error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }
}
