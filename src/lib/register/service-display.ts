/**
 * Service display helper — derive card copy dari source-of-truth.
 *
 * Pricing card di /register **TIDAK** boleh hardcoded di-CMS karena admin
 * sering lupa update saat PRICE_TABLE di-kalibrasi. Helper ini compute
 * price label langsung dari `lib/pricing-format` (single source of truth)
 * dan features dari i18n `register.fallback_packages.*` (locale-aware).
 *
 * Pemetaan service → price source:
 *   signal       → range signal_starter .. signal_vip  /bulan
 *   crypto       → range crypto_basic .. crypto_hnwi   /bulan
 *   vps          → range vps_license_only_setup .. vps_turnkey_setup  setup
 *   institutional→ range institutional_license_low .. institutional_license_high /yr
 *
 * Free service (Demo) tidak punya price card — handled di banner terpisah.
 */
import { formatPrice, formatPriceRange, type Locale, type PriceKey } from '@/lib/pricing-format';
import type { ServiceSlug } from './service-registry';

interface ServicePricingSpec {
  rangeLow: PriceKey;
  rangeHigh: PriceKey;
  period: 'mo' | 'setup' | 'yr';
  /** Compact format (Rp 600rb – Rp 4,9 juta) vs full (Rp 600.000 – Rp 4.900.000) */
  compact?: boolean;
}

const PRICING_SPEC: Record<Exclude<ServiceSlug, 'free'>, ServicePricingSpec> = {
  signal: {
    rangeLow: 'signal_starter',
    rangeHigh: 'signal_vip',
    period: 'mo',
    compact: true,
  },
  crypto: {
    rangeLow: 'crypto_basic',
    rangeHigh: 'crypto_hnwi',
    period: 'mo',
    compact: true,
  },
  vps: {
    rangeLow: 'vps_license_only_setup',
    rangeHigh: 'vps_turnkey_setup',
    period: 'setup',
    compact: true,
  },
  institutional: {
    rangeLow: 'institutional_license_low',
    rangeHigh: 'institutional_license_high',
    period: 'yr',
    compact: true,
  },
};

/** "Mulai dari" label — sweet spot harga terendah, untuk hook di card. */
const STARTING_FROM_KEY: Record<Exclude<ServiceSlug, 'free'>, PriceKey> = {
  signal: 'signal_starter',
  crypto: 'crypto_basic',
  vps: 'vps_license_only_setup',
  institutional: 'institutional_license_low',
};

/** Compute price label untuk service card. Returns range label. */
export function getServicePriceRange(slug: ServiceSlug, locale: Locale): string {
  if (slug === 'free') return locale === 'en' ? 'Free · 7 days' : 'Gratis · 7 hari';
  const spec = PRICING_SPEC[slug];
  return formatPriceRange(spec.rangeLow, spec.rangeHigh, locale, {
    period: spec.period,
    compact: spec.compact ?? true,
  });
}

/** Sweet-spot starting price untuk subtitle "Mulai dari $X". */
export function getServiceStartingFrom(slug: ServiceSlug, locale: Locale): string | null {
  if (slug === 'free') return null;
  const key = STARTING_FROM_KEY[slug];
  const spec = PRICING_SPEC[slug];
  return formatPrice(key, locale, { period: spec.period, compact: spec.compact ?? true });
}

/**
 * i18n key list untuk features card (4 bullets max per service).
 * Pakai existing `register.fallback_packages.*_feature_N` keys.
 */
export function getServiceFeatureKeys(slug: ServiceSlug): string[] {
  if (slug === 'free') {
    return [
      'free_feature_1',
      'free_feature_2',
      'free_feature_3',
      'free_feature_4',
    ];
  }
  const prefix = `fallback_packages.${slug}_feature_`;
  return [1, 2, 3, 4].map((n) => `${prefix}${n}`);
}

/** Optional note key per service — pricing model context. */
export function getServiceNoteKey(slug: ServiceSlug): string | null {
  if (slug === 'free') return null;
  return `fallback_packages.${slug}_note`;
}
