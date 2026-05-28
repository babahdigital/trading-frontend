/**
 * Single source of truth for which DB `Subscription.tier` values grant full
 * (non-preview) access to subscriber-only Signal content such as pair briefs.
 *
 * Kept here so the pair-brief LIST and DETAIL routes can't drift apart — the
 * detail route previously listed deprecated PAMM_* tiers and omitted
 * SIGNAL_STARTER / SIGNAL_PRO, so those subscribers got `full` in the list but
 * only `preview` in the detail. PAMM was removed per the 2026-04-26 zero-custody
 * audit.
 */
export const PAIR_BRIEF_SUBSCRIBER_TIERS = [
  'SIGNAL_STARTER',
  'SIGNAL_BASIC',
  'SIGNAL_PRO',
  'SIGNAL_VIP',
] as const;

export function isPairBriefSubscriber(tier: string | null | undefined): boolean {
  return tier != null && (PAIR_BRIEF_SUBSCRIBER_TIERS as readonly string[]).includes(tier);
}
