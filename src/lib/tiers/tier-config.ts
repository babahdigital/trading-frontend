/**
 * Tier configuration — single source of truth untuk feature gating + UI display.
 *
 * Tier matrix per Abdullah 2026-05-15 directive:
 *   free    → $0      → paper trading / signal view only, AI mode = SHADOW
 *   micro   → $100    → real trading kecil, qm_perfect_adx + pivot, 5 pair (BTC/ETH/EUR/USD/JPY)
 *   starter → $500    → full qm_perfect family, 7 forex major
 *   pro     → $1000   → + Kelly sizing aktif, 14 pair
 *   vip     → $2500   → + custom pair allow-list, AI mode = ADJUST (mutation)
 *
 * Backend (trading-forex Phase 14V) currently exposes:
 *   TIER_ORDER = ("beta", "starter", "pro", "vip", "dedicated")
 *   beta ≈ free  (alias)
 *   micro → $4.99/mo — SKU CRYPTO_MICRO live (shipped 2026-05-24).
 *
 * Strategi gating ini di FE adalah ADVISORY: yang authoritative tetap backend
 * (PATCH /api/forex/me/engines validation). FE pakai untuk hide feature dari
 * UI supaya UX tidak menampilkan tombol yang hasilnya 403.
 */

export type TierName = 'free' | 'micro' | 'starter' | 'pro' | 'vip';

/** Backend-internal alias mapping (Phase 14V naming). */
export const BACKEND_TIER_ALIAS: Record<TierName, string> = {
  free: 'beta',
  micro: 'micro',
  starter: 'starter',
  pro: 'pro',
  vip: 'vip',
};

export const TIER_ORDER: readonly TierName[] = ['free', 'micro', 'starter', 'pro', 'vip'];

export interface TierConfig {
  /** Slug stabil — dipakai untuk DB + i18n key */
  name: TierName;
  /** Display label — i18n via `tiers.<name>.label` */
  labelKey: string;
  /** Min equity USD (display + recommendation, not enforced) */
  minEquity: number;
  /** Subscription price USD/bulan (0 = free) */
  monthlyPrice: number;
  /** Allow real (live broker) trading vs paper-only */
  realTrading: boolean;
  /** Strategy slug list yang aktif di tier ini (mirror backend registry) */
  strategies: readonly string[];
  /** Aset allow-list (pair count limit) — empty = unlimited */
  pairs: readonly string[];
  /** AI brain mode: 'shadow' = observe only, 'live' = execute, 'adjust' = mutation (VIP) */
  aiMode: 'shadow' | 'live' | 'adjust';
  /** Kelly fractional sizing aktif (pro+) */
  kelly: boolean;
  /** Custom pair allow-list bisa di-override user (vip+) */
  customAllowList: boolean;
  /** Brand color untuk badge / accent — Tailwind class fragment */
  accent: 'slate' | 'blue' | 'amber' | 'violet' | 'fuchsia';
  /** SEO description suffix per tier (untuk pricing detail page) */
  seoSummaryKey: string;
}

export const TIERS: Record<TierName, TierConfig> = {
  free: {
    name: 'free',
    labelKey: 'tiers.free.label',
    minEquity: 0,
    monthlyPrice: 0,
    realTrading: false,
    strategies: ['smc'], // signal view read-only
    pairs: [],
    aiMode: 'shadow',
    kelly: false,
    customAllowList: false,
    accent: 'slate',
    seoSummaryKey: 'tiers.free.seo',
  },
  micro: {
    name: 'micro',
    labelKey: 'tiers.micro.label',
    minEquity: 100,
    monthlyPrice: 4.99,
    realTrading: true,
    strategies: ['qm_perfect_adx', 'pivot_mean_reversion'],
    pairs: ['BTCUSD', 'ETHUSD', 'EURUSD', 'USDJPY', 'XAUUSD'],
    aiMode: 'live',
    kelly: false,
    customAllowList: false,
    accent: 'blue',
    seoSummaryKey: 'tiers.micro.seo',
  },
  starter: {
    name: 'starter',
    labelKey: 'tiers.starter.label',
    minEquity: 500,
    // 2026-05-22 audit fix — was 19, drift dari PRICE_TABLE.signal_starter=$39
    // (kenaikan 2026-05-19 per AI cost). Sekarang aligned.
    monthlyPrice: 39,
    realTrading: true,
    strategies: ['qm_perfect_pure', 'qm_perfect_ao', 'qm_perfect_adx', 'qm_perfect_full', 'pivot_mean_reversion'],
    pairs: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD'],
    aiMode: 'live',
    kelly: false,
    customAllowList: false,
    accent: 'amber',
    seoSummaryKey: 'tiers.starter.seo',
  },
  pro: {
    name: 'pro',
    labelKey: 'tiers.pro.label',
    minEquity: 1000,
    monthlyPrice: 79,
    realTrading: true,
    strategies: [
      'qm_perfect_pure', 'qm_perfect_ao', 'qm_perfect_adx', 'qm_perfect_full', 'qm_perfect_adx_h4',
      'swing_qm_perfect_pure', 'swing_qm_perfect_ao', 'swing_qm_perfect_adx', 'swing_qm_perfect_full',
      'pivot_mean_reversion',
    ],
    pairs: [
      'EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD',
      'XAUUSD', 'XAGUSD', 'USOIL', 'UKOIL', 'XNGUSD', 'BTCUSD', 'ETHUSD',
    ],
    aiMode: 'live',
    kelly: true,
    customAllowList: false,
    accent: 'violet',
    seoSummaryKey: 'tiers.pro.seo',
  },
  vip: {
    name: 'vip',
    labelKey: 'tiers.vip.label',
    minEquity: 2500,
    monthlyPrice: 299,
    realTrading: true,
    strategies: [
      'qm_perfect_pure', 'qm_perfect_ao', 'qm_perfect_adx', 'qm_perfect_full', 'qm_perfect_adx_h4',
      'swing_qm_perfect_pure', 'swing_qm_perfect_ao', 'swing_qm_perfect_adx', 'swing_qm_perfect_full',
      'pivot_mean_reversion',
    ],
    pairs: [], // unlimited via custom allow-list
    aiMode: 'adjust',
    kelly: true,
    customAllowList: true,
    accent: 'fuchsia',
    seoSummaryKey: 'tiers.vip.seo',
  },
};

/** Compare tier rank — return negative kalau a < b, positive kalau a > b. */
export function compareTier(a: TierName, b: TierName): number {
  return TIER_ORDER.indexOf(a) - TIER_ORDER.indexOf(b);
}

/** Tier user >= minimum required tier. */
export function tierAtLeast(userTier: TierName, minRequired: TierName): boolean {
  return compareTier(userTier, minRequired) >= 0;
}

/** Map backend tier slug (beta/dedicated) ke FE tier name. Unknown → 'free'. */
export function normalizeBackendTier(backendSlug: string | null | undefined): TierName {
  if (!backendSlug) return 'free';
  const lower = backendSlug.toLowerCase();
  if (lower === 'beta') return 'free';
  if (lower === 'dedicated') return 'vip'; // dedicated maps to vip semantics
  if ((TIER_ORDER as readonly string[]).includes(lower)) return lower as TierName;
  return 'free';
}

/** Resolve apakah user tier punya strategy tertentu enabled. */
export function tierHasStrategy(tier: TierName, strategySlug: string): boolean {
  return TIERS[tier].strategies.includes(strategySlug);
}

/** Resolve apakah user tier bisa trade pair tertentu. */
export function tierHasPair(tier: TierName, pair: string): boolean {
  const cfg = TIERS[tier];
  if (cfg.pairs.length === 0) return cfg.customAllowList; // unlimited untuk vip
  return cfg.pairs.includes(pair.toUpperCase());
}

/** Accent color → semantic Tailwind class for badge + ring. */
export function tierAccentClasses(accent: TierConfig['accent']): { bg: string; text: string; ring: string } {
  switch (accent) {
    case 'slate':
      return { bg: 'bg-slate-500/15', text: 'text-slate-700 dark:text-slate-300', ring: 'ring-slate-500/30' };
    case 'blue':
      return { bg: 'bg-blue-500/15', text: 'text-blue-700 dark:text-blue-300', ring: 'ring-blue-500/30' };
    case 'amber':
      return { bg: 'bg-amber-500/15', text: 'text-amber-700 dark:text-amber-300', ring: 'ring-amber-500/30' };
    case 'violet':
      return { bg: 'bg-violet-500/15', text: 'text-violet-700 dark:text-violet-300', ring: 'ring-violet-500/30' };
    case 'fuchsia':
      return { bg: 'bg-fuchsia-500/15', text: 'text-fuchsia-700 dark:text-fuchsia-300', ring: 'ring-fuchsia-500/30' };
  }
}
