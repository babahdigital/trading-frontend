/**
 * Service registry for the unified `/register` flow.
 *
 * Single source of truth untuk:
 * - Card UI metadata (icon, title key, blurb key, accent)
 * - Flow type (signup wizard / lead form / booking embed)
 * - Tier options (kalau wizard)
 * - Submit endpoint + payload shape
 * - Legacy URL slug → canonical service mapping (untuk 301 redirect)
 *
 * Penambahan service baru cukup append entry ke `SERVICES` di bawah —
 * orchestrator `/register?service=X` otomatis surface tanpa code change.
 */
import type { PriceKey } from '@/lib/pricing-format';

export type ServiceSlug = 'signal' | 'crypto' | 'vps' | 'institutional' | 'free';
export type FlowKind = 'signup_wizard' | 'lead_form' | 'booking';

export interface WizardTier {
  /** Internal tier value POSTed ke backend */
  value: string;
  /** i18n key untuk display label (resolved by caller) */
  labelKey: string;
  /** i18n key untuk description */
  descKey: string;
  /** Pricing key dari lib/pricing-format */
  priceKey: PriceKey;
  /** Optional URL query alias (`?tier=swing` → SIGNAL_STARTER) */
  urlAlias?: string;
  /** Highlight badge "Popular" / "Best Value" */
  popular?: boolean;
}

export interface WizardCopy {
  eyebrowKey: string;
  titleKey: string;
  subtitleKey: string;
  submitKey?: string;
  /** VPS lead-form success branch */
  successTitleKey?: string;
  successBodyKey?: string;
  /** VPS lead-form fields */
  messagePlaceholderKey?: string;
  legalNoteKey?: string;
}

export interface ServiceDescriptor {
  slug: ServiceSlug;
  /** Mapped icon name dari lucide-react (resolved di komponen UI) */
  iconKey: 'TrendingUp' | 'Bitcoin' | 'Server' | 'Sparkles' | 'Gift';
  /** i18n key path untuk card title di picker */
  titleKey: string;
  blurbKey: string;
  ctaKey: string;
  /** i18n keys untuk wizard/form heading + submit copy (service-specific) */
  wizard: WizardCopy;
  /** Cara FE handle submit untuk service ini */
  flow: FlowKind;
  /** Wizard tiers (kalau flow === 'signup_wizard') */
  tiers?: WizardTier[];
  /** Submit endpoint + payload schema kalau flow === 'signup_wizard' */
  submitEndpoint?: string;
  /** Extra payload field jakah service-specific (mis. crypto: product='crypto') */
  extraPayload?: Record<string, string>;
  /** Highlight card di picker */
  popular?: boolean;
  /** Legacy slug aliases — old URL `/register/signal` redirects ke ?service=signal */
  legacySlugs?: string[];
}

export const SERVICES: ServiceDescriptor[] = [
  {
    slug: 'signal',
    iconKey: 'TrendingUp',
    titleKey: 'tier_signal_name',
    blurbKey: 'tier_signal_desc',
    ctaKey: 'select_package',
    flow: 'signup_wizard',
    submitEndpoint: '/api/auth/register',
    extraPayload: { product: 'signal' },
    popular: true,
    wizard: {
      eyebrowKey: 'signal.eyebrow_register',
      titleKey: 'signal.title_register',
      subtitleKey: 'signal.subtitle_register',
      submitKey: 'signal.btn_confirm',
    },
    tiers: [
      { value: 'SIGNAL_STARTER', labelKey: 'signal.tier1_label', descKey: 'signal.tier1_desc', priceKey: 'signal_starter', urlAlias: 'swing' },
      { value: 'SIGNAL_PRO', labelKey: 'signal.tier2_label', descKey: 'signal.tier2_desc', priceKey: 'signal_pro', urlAlias: 'scalping', popular: true },
      { value: 'SIGNAL_VIP', labelKey: 'signal.tier3_label', descKey: 'signal.tier3_desc', priceKey: 'signal_vip', urlAlias: 'all' },
    ],
    legacySlugs: ['signal'],
  },
  {
    slug: 'crypto',
    iconKey: 'Bitcoin',
    titleKey: 'tier_crypto_name',
    blurbKey: 'tier_crypto_desc',
    ctaKey: 'select_package',
    flow: 'signup_wizard',
    submitEndpoint: '/api/auth/register',
    extraPayload: { product: 'crypto' },
    wizard: {
      eyebrowKey: 'crypto.eyebrow',
      titleKey: 'crypto.title',
      subtitleKey: 'crypto.subtitle',
      submitKey: 'crypto.btn_confirm',
    },
    tiers: [
      { value: 'CRYPTO_BASIC', labelKey: 'crypto.tier_basic_label', descKey: 'crypto.tier_basic_desc', priceKey: 'crypto_basic', urlAlias: 'basic' },
      { value: 'CRYPTO_PRO', labelKey: 'crypto.tier_pro_label', descKey: 'crypto.tier_pro_desc', priceKey: 'crypto_pro', urlAlias: 'pro', popular: true },
      { value: 'CRYPTO_HNWI', labelKey: 'crypto.tier_hnwi_label', descKey: 'crypto.tier_hnwi_desc', priceKey: 'crypto_hnwi', urlAlias: 'hnwi' },
    ],
    legacySlugs: ['crypto'],
  },
  {
    slug: 'vps',
    iconKey: 'Server',
    titleKey: 'tier_vps_name',
    blurbKey: 'tier_vps_desc',
    ctaKey: 'select_package',
    flow: 'lead_form',
    submitEndpoint: '/api/client/inquiries',
    extraPayload: { package: 'VPS_LICENSE' },
    wizard: {
      eyebrowKey: 'vps.eyebrow',
      titleKey: 'vps.title',
      subtitleKey: 'vps.subtitle',
      submitKey: 'vps.btn_submit',
      successTitleKey: 'vps.success_title',
      successBodyKey: 'vps.success_body',
      messagePlaceholderKey: 'vps.placeholder_message',
      legalNoteKey: 'institutional.contact_intro',
    },
    legacySlugs: ['vps'],
  },
  {
    slug: 'institutional',
    iconKey: 'Sparkles',
    titleKey: 'tier_institutional_name',
    blurbKey: 'tier_institutional_desc',
    ctaKey: 'contact_us',
    flow: 'booking',
    wizard: {
      eyebrowKey: 'institutional.eyebrow',
      titleKey: 'institutional.title',
      subtitleKey: 'institutional.lead_part1',
    },
    legacySlugs: ['institutional'],
  },
  {
    slug: 'free',
    iconKey: 'Gift',
    titleKey: 'free_title',
    blurbKey: 'free_blurb',
    ctaKey: 'free_cta',
    flow: 'signup_wizard',
    submitEndpoint: '/api/auth/register',
    extraPayload: { tier: 'FREE', accountType: 'demo' },
    wizard: {
      eyebrowKey: 'signal.eyebrow_demo',
      titleKey: 'signal.title_demo',
      subtitleKey: 'signal.subtitle_demo',
      submitKey: 'signal.btn_activate_demo',
    },
    legacySlugs: ['free'],
  },
];

export const SERVICES_BY_SLUG = new Map<ServiceSlug, ServiceDescriptor>(
  SERVICES.map((s) => [s.slug, s]),
);

/**
 * Resolve URL query `?tier=` alias ke tier.value canonical.
 * Returns default popular tier kalau alias tidak match.
 */
export function resolveTierFromAlias(service: ServiceDescriptor, alias: string | null): string | undefined {
  if (!service.tiers || service.tiers.length === 0) return undefined;
  if (alias) {
    const matched = service.tiers.find(
      (t) => t.urlAlias === alias.toLowerCase() || t.value.toLowerCase() === alias.toLowerCase(),
    );
    if (matched) return matched.value;
  }
  return service.tiers.find((t) => t.popular)?.value ?? service.tiers[0]!.value;
}
