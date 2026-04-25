export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';

/**
 * Current-month AI usage — derived from local AiCallLog mirror.
 *
 * AiCallLog rows are written by every backend AI invocation (pair brief,
 * blog generation, advisor). Token counts give cost approximation; precise
 * USD numbers come from the backend ledger when available.
 */

const TIER_BUDGETS: Record<string, { tokens: number; usd: number }> = {
  FREE: { tokens: 0, usd: 0 },
  STARTER: { tokens: 500_000, usd: 5 },
  SIGNAL_BASIC: { tokens: 500_000, usd: 5 },
  PAMM_BASIC: { tokens: 500_000, usd: 5 },
  SIGNAL_VIP: { tokens: 2_000_000, usd: 25 },
  PAMM_PRO: { tokens: 2_000_000, usd: 25 },
  PRO: { tokens: 2_000_000, usd: 25 },
  VIP: { tokens: 5_000_000, usd: 75 },
  DEDICATED: { tokens: 20_000_000, usd: 300 },
};

const COST_PER_TOKEN = 0.000_002; // rough blended estimate

export async function GET(request: NextRequest) {
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const calls = await prisma.aiCallLog.findMany({
    where: { createdAt: { gte: monthStart } },
    select: { inputTokens: true, outputTokens: true, success: true, purpose: true },
  });

  const inputTokens = calls.reduce((s, c) => s + c.inputTokens, 0);
  const outputTokens = calls.reduce((s, c) => s + c.outputTokens, 0);
  const totalTokens = inputTokens + outputTokens;
  const successCount = calls.filter((c) => c.success).length;
  const failureCount = calls.length - successCount;

  const byPurpose = new Map<string, { calls: number; tokens: number }>();
  for (const c of calls) {
    const slot = byPurpose.get(c.purpose) ?? { calls: 0, tokens: 0 };
    slot.calls += 1;
    slot.tokens += c.inputTokens + c.outputTokens;
    byPurpose.set(c.purpose, slot);
  }

  const tierKey = gate.effectiveTier.toUpperCase();
  const budget = TIER_BUDGETS[tierKey] ?? TIER_BUDGETS.FREE;
  const estimatedCost = totalTokens * COST_PER_TOKEN;
  const usagePct = budget.tokens > 0 ? (totalTokens / budget.tokens) * 100 : 0;

  return NextResponse.json({
    tier: gate.effectiveTier,
    period: 'current_month',
    period_start: monthStart.toISOString(),
    usage: {
      total_calls: calls.length,
      success_calls: successCount,
      failed_calls: failureCount,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      estimated_cost_usd: Math.round(estimatedCost * 100) / 100,
    },
    budget: {
      total_tokens: budget.tokens,
      total_usd: budget.usd,
      usage_pct: Math.round(usagePct * 10) / 10,
      remaining_tokens: Math.max(0, budget.tokens - totalTokens),
    },
    by_purpose: Array.from(byPurpose.entries())
      .map(([purpose, v]) => ({ purpose, calls: v.calls, tokens: v.tokens }))
      .sort((a, b) => b.tokens - a.tokens),
  });
}
