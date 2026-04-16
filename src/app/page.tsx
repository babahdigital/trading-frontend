import { prisma } from '@/lib/db/prisma';
import { getPageMetadataWithStructuredData } from '@/lib/seo';
import { LandingClient } from '@/components/landing-client';
import { BannerBar } from '@/components/cms/banner-bar';
import { PopupManager } from '@/components/cms/popup-manager';

export const dynamic = 'force-dynamic';

const FALLBACK = {
  title: 'BabahAlgo — Autonomous Intelligence. Institutional Precision.',
  description: 'AI-Powered Quantitative Trading Platform by BabahAlgo',
};

export async function generateMetadata() {
  const { metadata } = await getPageMetadataWithStructuredData('/', FALLBACK);
  return metadata;
}

export default async function GuestLandingPage() {
  // Fetch CMS data + structured data
  const { structuredData } = await getPageMetadataWithStructuredData('/', FALLBACK);

  // Fetch all CMS data server-side
  let sections: Record<string, { title: string; subtitle: string | null; content: Record<string, unknown> }> = {};
  let pricingTiers: Array<{ id: string; slug: string; name: string; price: string; subtitle: string | null; features: unknown; excluded: unknown; note: string | null; ctaLabel: string; ctaLink: string }> = [];
  let testimonials: Array<{ id: string; name: string; role: string | null; content: string; rating: number; avatarUrl: string | null }> = [];
  let faqs: Array<{ id: string; question: string; answer: string; category: string }> = [];

  try {
    const [sectionsRaw, tiers, testimonialsRaw, faqsRaw] = await Promise.all([
      prisma.landingSection.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.pricingTier.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.testimonial.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.faq.findMany({ where: { isVisible: true }, orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    ]);

    for (const s of sectionsRaw) {
      sections[s.slug] = { title: s.title, subtitle: s.subtitle, content: s.content as Record<string, unknown> };
    }
    pricingTiers = tiers.map((t: { id: string; slug: string; name: string; price: string; subtitle: string | null; features: unknown; excluded: unknown; note: string | null; ctaLabel: string; ctaLink: string }) => ({
      id: t.id, slug: t.slug, name: t.name, price: t.price, subtitle: t.subtitle,
      features: t.features, excluded: t.excluded, note: t.note, ctaLabel: t.ctaLabel, ctaLink: t.ctaLink,
    }));
    testimonials = testimonialsRaw.map((t: { id: string; name: string; role: string | null; content: string; rating: number; avatarUrl: string | null }) => ({
      id: t.id, name: t.name, role: t.role, content: t.content, rating: t.rating, avatarUrl: t.avatarUrl,
    }));
    faqs = faqsRaw.map((f: { id: string; question: string; answer: string; category: string }) => ({ id: f.id, question: f.question, answer: f.answer, category: f.category }));
  } catch {
    // DB not available — use fallback
  }

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <BannerBar />
      <LandingClient sections={sections} pricingTiers={pricingTiers} testimonials={testimonials} faqs={faqs} />
      <PopupManager />
    </>
  );
}
