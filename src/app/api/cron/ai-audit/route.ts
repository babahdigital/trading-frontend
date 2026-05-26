export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCronSecret } from '@/lib/auth/cron';

/**
 * Temporary AI usage audit endpoint.
 * Protected by CRON_SECRET — same as all /api/cron/* routes.
 * DELETE THIS FILE after audit is complete.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  }

  try {
    // 1. AI calls in last 24 hours grouped by purpose
    const last24h = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             sum("totalTokens")::bigint as total_tokens,
             sum(cost)::numeric as total_cost,
             sum(CASE WHEN success THEN 0 ELSE 1 END)::int as failures
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
      GROUP BY purpose ORDER BY total_tokens DESC`;

    // 2. AI calls in last 7 days grouped by purpose
    const last7d = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             sum("totalTokens")::bigint as total_tokens,
             round(count(*)::numeric / 7, 1) as avg_daily_calls,
             sum(cost)::numeric as total_cost
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY purpose ORDER BY total_tokens DESC`;

    // 3. CMS i18n sync calls hourly (last 48h)
    const cmsI18nHourly = await prisma.$queryRaw`
      SELECT date_trunc('hour', "createdAt") as hour,
             count(*)::int as calls,
             sum("totalTokens")::bigint as tokens
      FROM "AiCallLog"
      WHERE purpose = 'cms_i18n_translate_text'
        AND "createdAt" > NOW() - INTERVAL '48 hours'
      GROUP BY hour ORDER BY hour DESC LIMIT 24`;

    // 4. Worker runs for CMS i18n sync
    const workerRuns = await prisma.$queryRaw`
      SELECT worker, count(*)::int as runs,
             max("startedAt") as last_run
      FROM "WorkerRun"
      WHERE (worker LIKE '%i18n%' OR worker LIKE '%cms%')
        AND "startedAt" > NOW() - INTERVAL '24 hours'
      GROUP BY worker`;

    // 5. Blog article generator calls
    const blogCalls = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             sum("totalTokens")::bigint as tokens,
             max("createdAt") as last_call
      FROM "AiCallLog"
      WHERE (purpose LIKE '%blog%' OR purpose LIKE '%article%')
        AND "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY purpose ORDER BY tokens DESC`;

    // 6. AI calls in last 1 hour (check for per-page-load calls)
    const lastHour = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls_last_hour
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '1 hour'
      GROUP BY purpose ORDER BY calls_last_hour DESC`;

    // 7. Daily token growth over 7 days
    const dailyGrowth = await prisma.$queryRaw`
      SELECT date_trunc('day', "createdAt") as day,
             count(*)::int as calls,
             sum("totalTokens")::bigint as tokens
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day DESC`;

    // 8. Total lifetime stats
    const lifetimeStats = await prisma.$queryRaw`
      SELECT count(*)::int as total_calls,
             sum("totalTokens")::bigint as total_tokens,
             sum(cost)::numeric as total_cost,
             min("createdAt") as first_call,
             max("createdAt") as last_call
      FROM "AiCallLog"`;

    // 9. Top 10 most expensive individual calls
    const topExpensive = await prisma.$queryRaw`
      SELECT id, purpose, model, "totalTokens", cost, "createdAt", success
      FROM "AiCallLog"
      ORDER BY cost DESC NULLS LAST
      LIMIT 10`;

    // 10. CMS i18n calls specifically in last 7 days — total to verify fix
    const cmsI18n7d = await prisma.$queryRaw`
      SELECT count(*)::int as calls,
             sum("totalTokens")::bigint as tokens,
             sum(cost)::numeric as cost
      FROM "AiCallLog"
      WHERE purpose = 'cms_i18n_translate_text'
        AND "createdAt" > NOW() - INTERVAL '7 days'`;

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      queries: {
        '1_last_24h_by_purpose': last24h,
        '2_last_7d_by_purpose': last7d,
        '3_cms_i18n_hourly_48h': cmsI18nHourly,
        '4_worker_runs_24h': workerRuns,
        '5_blog_calls_7d': blogCalls,
        '6_last_hour': lastHour,
        '7_daily_growth': dailyGrowth,
        '8_lifetime_stats': lifetimeStats,
        '9_top_expensive': topExpensive,
        '10_cms_i18n_7d_total': cmsI18n7d,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
