import nextDynamic from 'next/dynamic';
import { prisma } from '@/lib/db/prisma';
import { getPageMetadataWithStructuredData } from '@/lib/seo';
import { BannerBar } from '@/components/cms/banner-bar';
import { PopupManager } from '@/components/cms/popup-manager';
import { localizeLandingSection, localizePricingTier, localizeFaq } from '@/lib/i18n/localize-cms';
import { getPricingOverrides } from '@/lib/pricing-db';

const LandingClient = nextDynamic(
  () => import('@/components/landing-client').then((mod) => mod.LandingClient),
  {
    loading: () => (
      <div className="min-h-screen animate-pulse space-y-8 px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-4">
          <div className="h-10 w-3/4 rounded-lg bg-muted/30" />
          <div className="h-6 w-1/2 rounded-lg bg-muted/20" />
          <div className="h-64 rounded-xl bg-muted/20" />
        </div>
      </div>
    ),
  },
);

export const dynamic = 'force-dynamic';

const FALLBACK_ID = {
  title: 'BabahAlgo — Eksekusi Deterministik. Presisi Institusional.',
  description: 'Platform Trading Kuantitatif Algoritmik dari BabahAlgo — Forex + Crypto',
};

const FALLBACK_EN = {
  title: 'BabahAlgo — Deterministic Execution. Institutional Precision.',
  description: 'Algorithmic Quantitative Trading Platform by BabahAlgo — Forex + Crypto',
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  const fallback = isEn ? FALLBACK_EN : FALLBACK_ID;
  const { metadata } = await getPageMetadataWithStructuredData('/', fallback, isEn ? 'en' : 'id');
  return metadata;
}

export default async function GuestLandingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  const fallback = isEn ? FALLBACK_EN : FALLBACK_ID;
  // Fetch CMS data + structured data
  const { structuredData } = await getPageMetadataWithStructuredData('/', fallback, isEn ? 'en' : 'id');

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
      const localized = localizeLandingSection(s, locale);
      sections[s.slug] = localized;
    }
    pricingTiers = tiers.map((t) => {
      const loc = localizePricingTier(t, locale);
      return {
        id: loc.id, slug: loc.slug, name: loc.name, price: loc.price, subtitle: loc.subtitle,
        features: loc.features, excluded: loc.excluded, note: loc.note, ctaLabel: loc.ctaLabel, ctaLink: loc.ctaLink,
      };
    });
    testimonials = testimonialsRaw.map((t: { id: string; name: string; role: string | null; content: string; rating: number; avatarUrl: string | null }) => ({
      id: t.id, name: t.name, role: t.role, content: t.content, rating: t.rating, avatarUrl: t.avatarUrl,
    }));
    faqs = faqsRaw.map((f) => localizeFaq(f, locale));
  } catch {
    // DB not available — use fallback
  }

  // CMS pricing overlay — admin edit /admin/cms/pricing reflects immediately
  // ke landing tanpa redeploy. Fail-soft → hardcoded PRICE_TABLE fallback.
  const pricingOverrides = await getPricingOverrides();

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <BannerBar />
      <LandingClient sections={sections} pricingTiers={pricingTiers} testimonials={testimonials} faqs={faqs} pricingOverrides={pricingOverrides} />
      <PopupManager />
    </>
  );
}
