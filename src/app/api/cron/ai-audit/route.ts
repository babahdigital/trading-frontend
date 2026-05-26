export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCronSecret } from '@/lib/auth/cron';

/**
 * Temporary AI usage audit endpoint.
 * Protected by CRON_SECRET OR temporary audit token.
 * DELETE THIS FILE after audit is complete.
 *
 * AiCallLog schema: id, purpose, model, inputTokens, outputTokens, latencyMs,
 *                   success, errorMessage, metadata, createdAt
 * (no totalTokens or cost columns — must compute inline)
 */

// BigInt + Decimal safe JSON serializer
function serialize(data: unknown): string {
  return JSON.stringify(data, (_key, value) => {
    if (typeof value === 'bigint') return Number(value);
    // Prisma Decimal comes as object with toNumber()
    if (value && typeof value === 'object' && 'toNumber' in value) {
      return (value as { toNumber(): number }).toNumber();
    }
    return value;
  });
}

export async function GET(req: NextRequest) {
  const auditToken = req.nextUrl.searchParams.get('token');
  const isAuthed = verifyCronSecret(req) || auditToken === 'tmp-audit-2026-05-26-xK9mQ';
  if (!isAuthed) {
    return NextResponse.json({ code: 'unauthorized' }, { status: 401 });
  }

  try {
    // 1. AI calls in last 24 hours grouped by purpose
    const last24h = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as total_tokens,
             COALESCE(sum("inputTokens"), 0)::int as input_tokens,
             COALESCE(sum("outputTokens"), 0)::int as output_tokens,
             sum(CASE WHEN success THEN 0 ELSE 1 END)::int as failures
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '24 hours'
      GROUP BY purpose ORDER BY total_tokens DESC`;

    // 2. AI calls in last 7 days grouped by purpose
    const last7d = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as total_tokens,
             round(count(*)::numeric / 7, 1) as avg_daily_calls,
             COALESCE(sum("inputTokens"), 0)::int as input_tokens,
             COALESCE(sum("outputTokens"), 0)::int as output_tokens
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY purpose ORDER BY total_tokens DESC`;

    // 3. CMS i18n sync calls hourly (last 48h)
    const cmsI18nHourly = await prisma.$queryRaw`
      SELECT date_trunc('hour', "createdAt") as hour,
             count(*)::int as calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as tokens
      FROM "AiCallLog"
      WHERE purpose = 'cms_i18n_translate_text'
        AND "createdAt" > NOW() - INTERVAL '48 hours'
      GROUP BY hour ORDER BY hour DESC LIMIT 48`;

    // 4. Worker runs for CMS i18n sync
    const workerRuns = await prisma.$queryRaw`
      SELECT worker, count(*)::int as runs,
             max("startedAt") as last_run
      FROM "WorkerRun"
      WHERE (worker LIKE '%i18n%' OR worker LIKE '%cms%')
        AND "startedAt" > NOW() - INTERVAL '48 hours'
      GROUP BY worker`;

    // 5. Blog article generator calls
    const blogCalls = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as tokens,
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
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as tokens
      FROM "AiCallLog"
      WHERE "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY day ORDER BY day DESC`;

    // 8. Total lifetime stats
    const lifetimeStats = await prisma.$queryRaw`
      SELECT count(*)::int as total_calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as total_tokens,
             COALESCE(sum("inputTokens"), 0)::int as total_input,
             COALESCE(sum("outputTokens"), 0)::int as total_output,
             min("createdAt") as first_call,
             max("createdAt") as last_call
      FROM "AiCallLog"`;

    // 9. Top 10 most token-heavy individual calls
    const topExpensive = await prisma.$queryRaw`
      SELECT id, purpose, model, "inputTokens", "outputTokens",
             ("inputTokens" + "outputTokens") as total_tokens,
             "latencyMs", "createdAt", success
      FROM "AiCallLog"
      ORDER BY ("inputTokens" + "outputTokens") DESC
      LIMIT 10`;

    // 10. CMS i18n calls specifically in last 7 days -- total to verify fix
    const cmsI18n7d = await prisma.$queryRaw`
      SELECT count(*)::int as calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as tokens,
             COALESCE(sum("inputTokens"), 0)::int as input_tokens,
             COALESCE(sum("outputTokens"), 0)::int as output_tokens
      FROM "AiCallLog"
      WHERE purpose = 'cms_i18n_translate_text'
        AND "createdAt" > NOW() - INTERVAL '7 days'`;

    // 11. All CMS i18n related calls (text + json)
    const cmsI18nAll = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as calls,
             COALESCE(sum("inputTokens" + "outputTokens"), 0)::int as tokens
      FROM "AiCallLog"
      WHERE purpose LIKE 'cms_i18n%'
        AND "createdAt" > NOW() - INTERVAL '7 days'
      GROUP BY purpose ORDER BY tokens DESC`;

    // 12. Distinct purposes (all time)
    const distinctPurposes = await prisma.$queryRaw`
      SELECT purpose, count(*)::int as total_calls,
             max("createdAt") as last_seen
      FROM "AiCallLog"
      GROUP BY purpose ORDER BY total_calls DESC`;

    const result = {
      timestamp: new Date().toISOString(),
      note: 'Cost estimate: Gemini Flash Lite ~$0.075/M input, ~$0.30/M output',
      queries: {
        '1_last_24h_by_purpose': last24h,
        '2_last_7d_by_purpose': last7d,
        '3_cms_i18n_hourly_48h': cmsI18nHourly,
        '4_worker_runs_48h': workerRuns,
        '5_blog_calls_7d': blogCalls,
        '6_last_hour': lastHour,
        '7_daily_growth': dailyGrowth,
        '8_lifetime_stats': lifetimeStats,
        '9_top_token_heavy': topExpensive,
        '10_cms_i18n_7d_total': cmsI18n7d,
        '11_cms_i18n_all_purposes': cmsI18nAll,
        '12_distinct_purposes': distinctPurposes,
      },
    };

    return new Response(serialize(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const stack = error instanceof Error ? error.stack?.slice(0, 500) : undefined;
    return new Response(serialize({ code: 'internal_error', error: message, stack }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
