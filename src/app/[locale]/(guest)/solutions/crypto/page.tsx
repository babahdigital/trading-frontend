import { getTranslations } from 'next-intl/server';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqPageSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import type { Locale } from '@/lib/pricing-format';

import { HeroSection } from '@/components/solutions/crypto/hero-section';
import { FeaturesGrid } from '@/components/solutions/crypto/features-grid';
import { StrategiesSection } from '@/components/solutions/crypto/strategies-section';
import { TierMatrix } from '@/components/solutions/crypto/tier-matrix';
import { StepsSection } from '@/components/solutions/crypto/steps-section';
import { FaqSection, FAQ_KEYS } from '@/components/solutions/crypto/faq-section';
import { CtaSection } from '@/components/solutions/crypto/cta-section';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/solutions/crypto',
    {
      title: isEn
        ? 'Robot Crypto — Auto-trading on Binance | BabahAlgo'
        : 'Robot Crypto — Auto-trading di Binance | BabahAlgo',
      description: isEn
        ? 'Institutional Robot Crypto for Binance Spot + USDT-M Futures. 3 core strategies (SMC Scalper, SMC Swing, Pivot Mean Reversion) executed by deterministic decision engine + adaptive math risk modules, running 24/7 under a 12-layer risk framework. Capital stays in your Binance account — no fund custody.'
        : 'Robot Crypto institusional untuk Binance Spot + USDT-M Futures. 3 strategi inti (SMC Scalper, SMC Swing, Pivot Mean Reversion) dieksekusi oleh deterministic decision engine + adaptive math risk modules, jalan 24/7 dengan framework risiko 12-layer. Modal tetap di akun Binance Anda — tidak ada custody dana.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default async function CryptoBotSolutionPage({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations('solutions_crypto');
  const { locale } = await params;
  const localeKey: Locale = locale === 'en' ? 'en' : 'id';
  const FAQ_ITEMS = FAQ_KEYS.map((k) => ({ q: t(k.qKey), a: t(k.aKey) }));
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions/signal' },
    { name: 'Robot Crypto', url: '/solutions/crypto' },
  ]);
  const faq = faqPageSchema(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a })));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faq) }} />
      <EnterpriseNav />
      <main id="main-content">
        <HeroSection t={t} />
        <FeaturesGrid t={t} />
        <StrategiesSection t={t} localeKey={localeKey} />
        <TierMatrix t={t} localeKey={localeKey} />
        <StepsSection t={t} />
        <FaqSection t={t} />
        <CtaSection t={t} />
        <CryptoStickyCompare />
      </main>
      <EnterpriseFooter />
    </div>
  );
}

async function CryptoStickyCompare() {
  const ts = await getTranslations('shared');
  return (
    <StickyCtaBar
      message={ts('sticky_compare_text')}
      ctaLabel={ts('sticky_compare_cta')}
      href="/pricing"
    />
  );
}
