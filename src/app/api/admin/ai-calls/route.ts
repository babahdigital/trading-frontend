export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/ai-calls');

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const { searchParams } = new URL(request.url);
    const purpose = searchParams.get('purpose');
    const success = searchParams.get('success');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const where: Record<string, unknown> = {};
    if (purpose) where.purpose = purpose;
    if (success === 'true') where.success = true;
    if (success === 'false') where.success = false;

    const [entries, total, allEntries] = await Promise.all([
      prisma.aiCallLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.aiCallLog.count({ where }),
      // Summary stats across all records (no pagination filter, but use purpose/success filter)
      prisma.aiCallLog.findMany({
        where,
        select: {
          success: true,
          inputTokens: true,
          outputTokens: true,
        },
      }),
    ]);

    // Compute summary stats
    const totalCalls = allEntries.length;
    const successCount = allEntries.filter((e) => e.success).length;
    const successRate = totalCalls > 0 ? (successCount / totalCalls) * 100 : 0;
    const totalInputTokens = allEntries.reduce((acc, e) => acc + e.inputTokens, 0);
    const totalOutputTokens = allEntries.reduce((acc, e) => acc + e.outputTokens, 0);
    const totalTokens = totalInputTokens + totalOutputTokens;
    // Rough cost estimate: $3/M input, $15/M output (conservative average)
    const costEstimate = (totalInputTokens / 1_000_000) * 3 + (totalOutputTokens / 1_000_000) * 15;

    // Distinct purposes for filter dropdown
    const purposes = await prisma.aiCallLog.findMany({
      distinct: ['purpose'],
      select: { purpose: true },
      orderBy: { purpose: 'asc' },
    });

    return NextResponse.json({
      entries,
      total,
      summary: {
        totalCalls,
        successCount,
        successRate,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        costEstimate,
      },
      purposes: purposes.map((p) => p.purpose),
    });
  } catch (error) {
    log.error('List AI call logs error:', error);
    return NextResponse.json({ code: 'internal_error', error: 'Internal server error' }, { status: 500 });
  }
}
