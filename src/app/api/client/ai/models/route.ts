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

// 2026-05-19 — Migrasi HYBRID Claude → Moonshot Kimi K2.6.
// Pricing comparison per 1M tokens:
//   Claude Haiku 4.5  $1.00 in / $5.00 out  → REPLACED by Kimi K2.6
//   Claude Sonnet 4-6 $3.00 in / $15.00 out → REPLACED by Kimi K2.6
//   Claude Opus 4.7   $15.00 in / $75.00 out → KEEP untuk high-impact only
//   Kimi K2.6         $0.73 in / $3.49 out  ← 27-95% cheaper, 262K context
// Quality strategy:
//   - Routine bulk (chat, content, i18n, SEO meta) → Gemini Flash Lite
//     ($0.075/$0.30, 10× lebih murah dari Kimi — keep status quo).
//   - Customer-facing narrative AI advisor → Kimi K2.6 (PRO+ tier).
//   - Backend FUNDAMENTAL signal AI (entry/exit advisor) → Kimi K2.6.
//   - Backend RETROSPECT (weekly + tuning reviewer + L3 narrative)
//     → Kimi K2.6 (77% cheaper, kualitas reasoning cukup).
//   - Backend HIGH_IMPACT (FOMC/NFP escalation + kill-switch postmortem)
//     → TETAP Claude Opus 4.7. Sporadic (~5-10 calls/bulan), kualitas
//     edge-case reasoning critical untuk events tail-risk besar.
//     Opus exposure dibatasi by design via gating di router.py.
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
