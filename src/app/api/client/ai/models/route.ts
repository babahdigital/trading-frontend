export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';

/**
 * Available AI models per tier — server-side curation, no backend roundtrip.
 *
 * Models referenced here must exist in OpenRouter or equivalent provider; the
 * actual call is made by the backend AI advisor. Frontend only surfaces
 * what's selectable per tier so customers see consistent options.
 */

interface ModelDescriptor {
  id: string;
  label: string;
  provider: string;
  context_window: number;
  cost_tier: 'free' | 'low' | 'medium' | 'high';
  capabilities: string[];
  min_tier: 'STARTER' | 'PRO' | 'VIP' | 'DEDICATED';
}

// 2026-05-19 — Migrasi Claude Haiku/Sonnet/Opus → Moonshot Kimi K2.6.
// Pricing comparison per 1M tokens:
//   Claude Haiku 4.5  $1.00 in / $5.00 out
//   Claude Sonnet 4-6 $3.00 in / $15.00 out
//   Claude Opus 4.7   $15.00 in / $75.00 out
//   Kimi K2.6         $0.73 in / $3.49 out  ← 27-95% cheaper, 262K context
// Quality: Kimi K2.6 strong di reasoning + agentic orchestration, layak
// untuk narrative/edge-case-detection/multi-step. Untuk routine bulk
// (chat, content, i18n, SEO meta), tetap pakai Gemini Flash Lite yang
// 10× lebih murah ($0.075 in / $0.30 out).
const CATALOG: readonly ModelDescriptor[] = [
  {
    id: 'google/gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite',
    provider: 'Google',
    context_window: 1_000_000,
    cost_tier: 'low',
    capabilities: ['narrative', 'translation', 'fast-explainer'],
    min_tier: 'STARTER',
  },
  {
    id: 'google/gemini-2.5-flash',
    label: 'Gemini 2.5 Flash',
    provider: 'Google',
    context_window: 1_000_000,
    cost_tier: 'low',
    capabilities: ['narrative', 'translation', 'reasoning'],
    min_tier: 'STARTER',
  },
  {
    id: 'moonshotai/kimi-k2.6',
    label: 'Kimi K2.6',
    provider: 'Moonshot AI',
    context_window: 262_144,
    cost_tier: 'low',
    capabilities: ['narrative', 'reasoning', 'edge-case-detection', 'long-context', 'multi-step'],
    min_tier: 'PRO',
  },
];

const TIER_RANK: Record<string, number> = {
  FREE: 0,
  STARTER: 1,
  SIGNAL_BASIC: 1,
  PAMM_BASIC: 1,
  SIGNAL_VIP: 2,
  PAMM_PRO: 2,
  PRO: 2,
  VIP: 3,
  DEDICATED: 4,
};

function tierRank(tier: string): number {
  return TIER_RANK[tier.toUpperCase()] ?? 0;
}

function modelMinRank(min: ModelDescriptor['min_tier']): number {
  return TIER_RANK[min] ?? 0;
}

export async function GET(request: NextRequest) {
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  const userRank = tierRank(gate.effectiveTier);
  const available = CATALOG.filter((m) => userRank >= modelMinRank(m.min_tier));

  return NextResponse.json({
    tier: gate.effectiveTier,
    count: available.length,
    models: available,
  });
}
