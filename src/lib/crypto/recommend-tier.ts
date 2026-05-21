/**
 * recommendTier — pure function untuk recommend tier berdasarkan deposit USDT.
 *
 * Spec rc29 (per memory reference_crypto_pricing_rc29.md):
 *   - <$500       → free_demo (force; fee disproportionate akan churn user)
 *   - $500-1.5K   → starter ($9/mo, sweet @ $1K)
 *   - $1.5K-5K    → active  ($19/mo, sweet @ $2.5K)
 *   - $5K-25K     → pro     ($49/mo, sweet @ $10K)
 *   - ≥$25K       → hnwi    ($199/mo, sweet @ $50K)
 *
 * Returns tier metadata + bilingual rationale untuk FE display di onboarding
 * wizard. Backend mirror endpoint nanti: GET /api/v1/recommend-tier?equity=N.
 */

export type TierSlug = 'free_demo' | 'starter' | 'active' | 'pro' | 'hnwi';

export interface TierRecommendation {
  tier: TierSlug;
  fee_usd: number;
  fee_idr: number;
  max_slots: number;
  max_leverage: string;
  risk_per_trade: string;
  notional_cap: string;
  account_mode: 'demo' | 'live';
  demo_wallet_usdt?: number;
  /** Sweet spot deposit untuk tier ini (fee ≤ ~10% expected profit). */
  sweet_spot_usd: number;
  /** Estimasi profit/bulan @ 5% avg return crypto algo. */
  expected_profit_5pct_usd: number;
  /** Fee % dari profit (insight transparency). */
  fee_pct_of_profit: number;
  /** Verdict per modal: 'optimal' | 'sweet' | 'edge' | 'force_demo'. */
  verdict: 'optimal' | 'sweet' | 'edge' | 'force_demo';
  rationale: { id: string; en: string };
  message: { id: string; en: string };
  next_tier?: TierSlug;
  next_tier_threshold?: number;
}

const FEE_MAP: Record<TierSlug, { usd: number; idr: number }> = {
  free_demo: { usd: 0, idr: 0 },
  starter: { usd: 9, idr: 149_000 },
  active: { usd: 19, idr: 299_000 },
  pro: { usd: 49, idr: 799_000 },
  hnwi: { usd: 199, idr: 3_290_000 },
};

const SLOT_MAP: Record<TierSlug, number> = {
  free_demo: 1,
  starter: 2,
  active: 3,
  pro: 5,
  hnwi: 7,
};

const LEVERAGE_MAP: Record<TierSlug, string> = {
  free_demo: '2x',
  starter: '3x',
  active: '7x',
  pro: '12x',
  hnwi: '20x',
};

const RISK_MAP: Record<TierSlug, string> = {
  free_demo: '0.5%',
  starter: '1.0%',
  active: '1.25%',
  pro: '1.5%',
  hnwi: '2.0%',
};

const NOTIONAL_CAP_MAP: Record<TierSlug, string> = {
  free_demo: '30%',
  starter: '40%',
  active: '55%',
  pro: '60%',
  hnwi: '75%',
};

const SWEET_SPOT_MAP: Record<TierSlug, number> = {
  free_demo: 0,
  starter: 1_000,
  active: 2_500,
  pro: 10_000,
  hnwi: 50_000,
};

const NEXT_TIER_MAP: Record<TierSlug, { next: TierSlug; threshold: number } | null> = {
  free_demo: { next: 'starter', threshold: 500 },
  starter: { next: 'active', threshold: 1_500 },
  active: { next: 'pro', threshold: 5_000 },
  pro: { next: 'hnwi', threshold: 25_000 },
  hnwi: null,
};

function tierForDeposit(deposit: number): TierSlug {
  if (deposit < 500) return 'free_demo';
  if (deposit < 1_500) return 'starter';
  if (deposit < 5_000) return 'active';
  if (deposit < 25_000) return 'pro';
  return 'hnwi';
}

function verdictFor(tier: TierSlug, deposit: number, fee: number, expectedProfit: number): TierRecommendation['verdict'] {
  if (tier === 'free_demo') return 'force_demo';
  const feePctOfProfit = expectedProfit > 0 ? (fee / expectedProfit) * 100 : Infinity;
  if (feePctOfProfit > 30) return 'edge'; // fee >30% profit = warning
  if (deposit >= SWEET_SPOT_MAP[tier]) return 'optimal';
  return 'sweet';
}

/**
 * Main recommendation function — pure, no side effects.
 *
 * @param deposit USDT deposit amount (USD numeric)
 * @returns TierRecommendation with bilingual rationale + verdict
 */
export function recommendTier(deposit: number): TierRecommendation {
  const safe = Math.max(0, Number.isFinite(deposit) ? deposit : 0);
  const tier = tierForDeposit(safe);
  const fee = FEE_MAP[tier].usd;
  // Expected profit @ 5% monthly average (industri benchmark crypto algo trading)
  const expectedProfit = safe * 0.05;
  const feePctOfProfit = expectedProfit > 0 ? (fee / expectedProfit) * 100 : 0;
  const verdict = verdictFor(tier, safe, fee, expectedProfit);
  const next = NEXT_TIER_MAP[tier];

  const rec: TierRecommendation = {
    tier,
    fee_usd: fee,
    fee_idr: FEE_MAP[tier].idr,
    max_slots: SLOT_MAP[tier],
    max_leverage: LEVERAGE_MAP[tier],
    risk_per_trade: RISK_MAP[tier],
    notional_cap: NOTIONAL_CAP_MAP[tier],
    account_mode: tier === 'free_demo' ? 'demo' : 'live',
    demo_wallet_usdt: tier === 'free_demo' ? 5_000 : undefined,
    sweet_spot_usd: SWEET_SPOT_MAP[tier],
    expected_profit_5pct_usd: Math.round(expectedProfit),
    fee_pct_of_profit: Math.round(feePctOfProfit * 10) / 10,
    verdict,
    rationale: buildRationale(tier, safe, fee, expectedProfit, feePctOfProfit, verdict),
    message: buildMessage(tier, safe, verdict, next),
    next_tier: next?.next,
    next_tier_threshold: next?.threshold,
  };
  return rec;
}

function buildRationale(
  tier: TierSlug,
  deposit: number,
  fee: number,
  expectedProfit: number,
  feePct: number,
  verdict: TierRecommendation['verdict'],
): TierRecommendation['rationale'] {
  if (tier === 'free_demo') {
    return {
      id: `Modal Anda $${Math.round(deposit)} di bawah ambang $500 untuk tier berbayar. Kami arahkan ke FREE DEMO ($5.000 wallet simulasi) — tanpa risiko + tanpa biaya, 30 hari trial.`,
      en: `Your capital $${Math.round(deposit)} is below the $500 paid-tier threshold. We route you to FREE DEMO ($5,000 sim wallet) — risk-free + no cost, 30-day trial.`,
    };
  }
  const verdictLabel = {
    optimal: { id: 'optimal — fee minimal relatif profit', en: 'optimal — fee minimal vs profit' },
    sweet: { id: 'sweet spot — fee proporsional', en: 'sweet spot — fee proportional' },
    edge: { id: 'edge — butuh win rate tinggi supaya fee terbayar', en: 'edge — needs high win rate to justify fee' },
    force_demo: { id: 'demo only', en: 'demo only' },
  }[verdict];
  return {
    id: `Tier ${tier.toUpperCase()} cocok untuk modal $${Math.round(deposit)}. Estimasi profit @ 5%/bulan = $${Math.round(expectedProfit)}. Fee $${fee}/bulan = ${feePct.toFixed(1)}% dari profit — ${verdictLabel.id}.`,
    en: `Tier ${tier.toUpperCase()} fits $${Math.round(deposit)} capital. Estimated profit @ 5%/mo = $${Math.round(expectedProfit)}. Fee $${fee}/mo = ${feePct.toFixed(1)}% of profit — ${verdictLabel.en}.`,
  };
}

function buildMessage(
  tier: TierSlug,
  deposit: number,
  verdict: TierRecommendation['verdict'],
  next: { next: TierSlug; threshold: number } | null,
): TierRecommendation['message'] {
  if (tier === 'free_demo') {
    return {
      id: 'Mulai trial gratis 30 hari dengan demo wallet $5.000 USDT. Setelah profit demo konsisten, topup ≥$500 untuk upgrade ke Starter (live trading).',
      en: 'Start a free 30-day trial with $5,000 USDT demo wallet. After consistent demo profit, top up ≥$500 to upgrade to Starter (live trading).',
    };
  }
  const nextLabel = next ? {
    id: ` Topup ke $${next.threshold.toLocaleString('id-ID')} untuk akses tier ${next.next.toUpperCase()} (lebih banyak slot + leverage).`,
    en: ` Top up to $${next.threshold.toLocaleString('en-US')} to access ${next.next.toUpperCase()} tier (more slots + leverage).`,
  } : { id: '', en: '' };
  if (verdict === 'optimal') {
    return {
      id: `Modal $${Math.round(deposit)} optimal untuk tier ini — fee minimal relatif profit.${nextLabel.id}`,
      en: `$${Math.round(deposit)} capital is optimal for this tier — fee minimal relative to profit.${nextLabel.en}`,
    };
  }
  if (verdict === 'sweet') {
    return {
      id: `Modal $${Math.round(deposit)} masuk sweet spot tier ini — fee proporsional ke ekspektasi profit.${nextLabel.id}`,
      en: `$${Math.round(deposit)} capital is in tier sweet spot — fee proportional to expected profit.${nextLabel.en}`,
    };
  }
  return {
    id: `Tier ini bisa Anda mulai, tetapi pertimbangkan topup supaya fee lebih kecil persentasenya terhadap profit.${nextLabel.id}`,
    en: `You can start at this tier, but consider topping up so fee becomes a smaller % of profit.${nextLabel.en}`,
  };
}

/** Display utility — tier slug → display name. */
export function tierDisplayName(tier: TierSlug, locale: 'id' | 'en' = 'id'): string {
  const map: Record<TierSlug, { id: string; en: string }> = {
    free_demo: { id: 'Demo Free', en: 'Demo Free' },
    starter: { id: 'Starter', en: 'Starter' },
    active: { id: 'Active', en: 'Active' },
    pro: { id: 'Pro', en: 'Pro' },
    hnwi: { id: 'HNWI', en: 'HNWI' },
  };
  return map[tier][locale];
}
