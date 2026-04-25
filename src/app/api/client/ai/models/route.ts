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
    id: 'anthropic/claude-haiku-4-5',
    label: 'Claude Haiku 4.5',
    provider: 'Anthropic',
    context_window: 200_000,
    cost_tier: 'medium',
    capabilities: ['narrative', 'reasoning', 'edge-case-detection'],
    min_tier: 'PRO',
  },
  {
    id: 'anthropic/claude-sonnet-4-6',
    label: 'Claude Sonnet 4.6',
    provider: 'Anthropic',
    context_window: 200_000,
    cost_tier: 'high',
    capabilities: ['deep-reasoning', 'risk-overlay', 'multi-step'],
    min_tier: 'VIP',
  },
  {
    id: 'openai/gpt-4.1-mini',
    label: 'GPT-4.1 Mini',
    provider: 'OpenAI',
    context_window: 128_000,
    cost_tier: 'medium',
    capabilities: ['narrative', 'translation', 'fast-explainer'],
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
