import nextDynamic from 'next/dynamic';
import { prisma } from '@/lib/db/prisma';
import { getPageMetadataWithStructuredData } from '@/lib/seo';
import { BannerBar } from '@/components/cms/banner-bar';
import { PopupManager } from '@/components/cms/popup-manager';
import { localizeLandingSection, localizePricingTier, localizeFaq } from '@/lib/i18n/localize-cms';
import { getPricingOverrides } from '@/lib/pricing-db';
import { getTradingSettings } from '@/lib/trading/trading-settings';

import { EnterpriseNav } from '@/components/layout/enterprise-nav';

const LandingClient = nextDynamic(
  () => import('@/components/landing-client').then((mod) => mod.LandingClient),
  {
    loading: () => (
      <div className="min-h-screen bg-background text-foreground">
        <EnterpriseNav />
        <section className="relative min-h-[calc(100vh-4rem)] flex items-center">
          <div className="container-default w-full px-4 sm:px-6 py-16 sm:py-20 lg:py-24">
            <div className="lg:max-w-[58%]">
              <div className="t-eyebrow mb-5 h-4 w-48 rounded bg-muted/20 animate-pulse" />
              <h1 className="t-display-hero text-foreground mb-7">
                Algorithmic<br />Quantitative Trading
              </h1>
              <p className="t-lead text-muted-foreground max-w-xl mb-9">
                Eksekusi deterministik 24/7 dengan presisi institusional.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <span className="btn-primary opacity-50 pointer-events-none">Jadwalkan Briefing</span>
                <span className="btn-secondary opacity-50 pointer-events-none">Coba Demo Gratis</span>
              </div>
            </div>
          </div>
        </section>
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
  const [pricingOverrides, tradingSettings] = await Promise.all([
    getPricingOverrides(),
    getTradingSettings(),
  ]);

  const tradingInfo = {
    strategyCount: String(tradingSettings.forexStrategies.length),
    assetCount: `${tradingSettings.forexPairs.live.length + tradingSettings.forexPairs.shadow.length}+`,
  };

  return (
    <>
      {structuredData && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      )}
      <BannerBar />
      <LandingClient sections={sections} pricingTiers={pricingTiers} testimonials={testimonials} faqs={faqs} pricingOverrides={pricingOverrides} tradingInfo={tradingInfo} />
      <PopupManager />
    </>
  );
}
