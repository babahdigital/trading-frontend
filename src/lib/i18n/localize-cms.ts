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
