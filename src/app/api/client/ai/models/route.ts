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

// 2026-05-19 — Migrasi HYBRID Claude → Gemini 2.5 Flash (BUKAN Kimi).
// Comparative pricing per 1M tokens:
//   Claude Haiku 4.5    $1.00  / $5.00   → REPLACED
//   Claude Sonnet 4-6   $3.00  / $15.00  → REPLACED
//   Claude Opus 4.7     $15.00 / $75.00  → KEEP untuk high-impact only
//   Kimi K2.6           $0.73  / $3.49   (262K context)
//   Gemini 2.5 Flash    $0.30  / $2.50   (1M context, configurable thinking)
//
// Decision: Gemini 2.5 Flash > Kimi K2.6 untuk replacement:
//   - 2.5× lebih murah input ($0.30 vs $0.73)
//   - 28% lebih murah output ($2.50 vs $3.49)
//   - 4× context window (1M vs 262K) — ample untuk weekly retrospect
//   - Configurable thinking budget — reasoning depth scalable per call
//   - Provider consistency: kita sudah pakai Gemini Flash Lite untuk
//     routine; Gemini Flash untuk reasoning = 1 provider, simpler ops.
//
// Quality strategy:
//   - Routine bulk (chat, content, i18n, SEO meta) → Gemini Flash Lite
//     ($0.075/$0.30) — keep status quo, paling murah untuk volume tinggi.
//   - Customer-facing narrative AI advisor → Gemini 2.5 Flash (PRO+).
//   - Backend FUNDAMENTAL signal AI (entry/exit advisor) → Gemini 2.5 Flash.
//   - Backend RETROSPECT (weekly + tuning reviewer + L3 narrative)
//     → Gemini 2.5 Flash.
//   - Backend HIGH_IMPACT (FOMC/NFP + kill-switch postmortem)
//     → TETAP Claude Opus 4.7 (sporadic, edge-case reasoning critical
//     untuk tail-risk events).
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
    label: 'Gemini 2.5 Flash · Reasoning',
    provider: 'Google',
    context_window: 1_000_000,
    cost_tier: 'low',
    capabilities: ['narrative', 'reasoning', 'edge-case-detection', 'long-context', 'multi-step', 'thinking'],
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
