import type { LandingSection, PricingTier, Faq } from '@prisma/client';

export function localizeLandingSection(
  section: LandingSection,
  locale: string
): { title: string; subtitle: string | null; content: Record<string, unknown> } {
  return {
    title: locale === 'en' && section.title_en ? section.title_en : section.title,
    subtitle: locale === 'en' && section.subtitle_en ? section.subtitle_en : section.subtitle,
    content: (locale === 'en' && section.content_en ? section.content_en : section.content) as Record<string, unknown>,
  };
}

/**
 * Universal Indonesian time-unit suffixes that need locale-swap on EN render.
 * Price strings are stored as plain text (no price_en column); we swap
 * "/bulan" → "/mo" and similar suffixes when serving EN locale so prices
 * read naturally in either language without DB migration.
 */
function localizePriceText(text: string, locale: string): string {
  if (locale !== 'en' || !text) return text;
  return text
    .replace(/\/bulan\b/g, '/mo')
    .replace(/\/bln\b/g, '/mo')
    .replace(/\bper bulan\b/gi, 'per month')
    .replace(/\bsetiap bulan\b/gi, 'monthly')
    .replace(/\bsekali bayar\b/gi, 'one-time')
    .replace(/\bbiaya setup\b/gi, 'setup fee')
    .replace(/\bmaintenance\b/gi, 'maintenance');
}

export function localizePricingTier(
  tier: PricingTier,
  locale: string
): PricingTier {
  return {
    ...tier,
    name: locale === 'en' && tier.name_en ? tier.name_en : tier.name,
    subtitle: locale === 'en' && tier.subtitle_en ? tier.subtitle_en : tier.subtitle,
    features: locale === 'en' && tier.features_en ? tier.features_en : tier.features,
    ctaLabel: locale === 'en' && tier.ctaLabel_en ? tier.ctaLabel_en : tier.ctaLabel,
    // Price + note are not separately localized (no _en columns) — use
    // word-level fallback swap for common Indonesian time-unit suffixes.
    price: localizePriceText(tier.price, locale),
    note: tier.note ? localizePriceText(tier.note, locale) : tier.note,
  };
}

export function localizeFaq(
  faq: Faq,
  locale: string
): { id: string; question: string; answer: string; category: string } {
  return {
    id: faq.id,
    question: locale === 'en' && faq.question_en ? faq.question_en : faq.question,
    answer: locale === 'en' && faq.answer_en ? faq.answer_en : faq.answer,
    category: faq.category,
  };
}
