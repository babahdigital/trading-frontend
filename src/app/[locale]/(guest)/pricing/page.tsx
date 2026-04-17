import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { localizePricingTier } from '@/lib/i18n/localize-cms';
import { ArrowRight } from 'lucide-react';

type Tier = Parameters<typeof localizePricingTier>[0];

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('pricing');
  return getPageMetadata('/pricing', {
    title: `${t('title')} — BabahAlgo`,
    description: 'Choose the right engagement model for your trading needs.',
  });
}

export default async function PricingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('pricing');

  let tiers: Array<{
    slug: string; name: string; price: string; subtitle: string | null;
    features: string[]; excluded: string[]; ctaLabel: string; ctaLink: string;
  }> = [];
  try {
    const { prisma } = await import('@/lib/db/prisma');
    const raw = await prisma.pricingTier.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } });
    tiers = raw.map((r: Tier) => {
      const loc = localizePricingTier(r, locale);
      return {
        slug: loc.slug, name: loc.name, price: loc.price, subtitle: loc.subtitle,
        features: Array.isArray(loc.features) ? loc.features as string[] : [],
        excluded: Array.isArray(loc.excluded) ? loc.excluded as string[] : [],
        ctaLabel: loc.ctaLabel, ctaLink: loc.ctaLink,
      };
    });
  } catch { /* DB unavailable — use fallback */ }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6 text-center">
            <p className="t-eyebrow mb-4">Pricing</p>
            <h1 className="t-display-page mb-4">{t('title')}</h1>
            <p className="t-lead text-foreground/60 max-w-2xl mx-auto">{t('subtitle')}</p>
          </div>
        </section>

        {/* 3 Audience Columns */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Individual */}
              <div className="card-enterprise flex flex-col">
                <p className="t-eyebrow mb-4">Individual</p>
                <h3 className="text-xl font-medium mb-2">Signal Service</h3>
                <p className="font-display text-4xl font-medium mb-1">
                  $49–149<span className="text-lg text-foreground/40 font-normal">/mo</span>
                </p>
                <p className="t-body-sm text-foreground/50 mb-6">AI-powered trading signals to your dashboard and Telegram.</p>
                <ul className="space-y-2.5 flex-1 mb-8">
                  <FeatureItem>Real-time AI signal generation</FeatureItem>
                  <FeatureItem>Dashboard with performance metrics</FeatureItem>
                  <FeatureItem>Telegram VIP alerts (Pro tier)</FeatureItem>
                  <FeatureItem>Daily performance reports</FeatureItem>
                </ul>
                <Link href="/solutions/signal" className="btn-secondary w-full justify-center">
                  {t('cta')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Professional — Featured */}
              <div className="card-enterprise flex flex-col relative border-amber-500/40">
                <span className="absolute -top-3 left-6 bg-amber-500 text-black text-xs font-medium px-3 py-1 rounded-full">
                  Most popular
                </span>
                <p className="t-eyebrow mb-4">Professional</p>
                <h3 className="text-xl font-medium mb-2">PAMM / VPS License</h3>
                <p className="font-display text-4xl font-medium mb-1">
                  20–30%<span className="text-lg text-foreground/40 font-normal ml-2">share</span>
                </p>
                <p className="t-body-sm text-foreground/50 mb-2">Managed trading or dedicated infrastructure.</p>
                <p className="text-xs text-foreground/40 mb-6">VPS License: from $3,000 setup + $150/mo</p>
                <ul className="space-y-2.5 flex-1 mb-8">
                  <FeatureItem>Fully managed PAMM account</FeatureItem>
                  <FeatureItem>Dedicated VPS with full bot access</FeatureItem>
                  <FeatureItem>Advanced dashboard and reports</FeatureItem>
                  <FeatureItem>Priority support channel</FeatureItem>
                </ul>
                <Link href="/solutions/pamm" className="btn-primary w-full justify-center">
                  {t('cta')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Institutional */}
              <div className="card-enterprise flex flex-col">
                <p className="t-eyebrow mb-4">Institutional</p>
                <h3 className="text-xl font-medium mb-2">Managed Account</h3>
                <p className="font-display text-4xl font-medium mb-1">Custom</p>
                <p className="t-body-sm text-foreground/50 mb-6">Custom mandate, API access, white-label. Starting AUM: $250K.</p>
                <ul className="space-y-2.5 flex-1 mb-8">
                  <FeatureItem>Custom mandate and risk parameters</FeatureItem>
                  <FeatureItem>API access for integration</FeatureItem>
                  <FeatureItem>White-label option</FeatureItem>
                  <FeatureItem>Dedicated quant team contact</FeatureItem>
                  <FeatureItem>IMA and compliance documentation</FeatureItem>
                </ul>
                <Link href="/contact" className="btn-secondary w-full justify-center">
                  {t('contact')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-3">Comparison</p>
            <h2 className="t-display-sub mb-12">Feature comparison</h2>
            <div className="table-enterprise-wrapper">
              <table className="table-enterprise">
                <thead>
                  <tr>
                    <th className="!text-left">Feature</th>
                    <th className="!text-center">Signal</th>
                    <th className="!text-center">PAMM</th>
                    <th className="!text-center">License</th>
                    <th className="!text-center">Institutional</th>
                  </tr>
                </thead>
                <tbody>
                  <CompRow feature="Dashboard access" signal pro license inst />
                  <CompRow feature="AI signal generation" signal pro license inst />
                  <CompRow feature="Automated execution" pro license inst />
                  <CompRow feature="Telegram alerts" signal />
                  <CompRow feature="Daily reports" signal pro license inst />
                  <CompRow feature="Dedicated VPS" license inst />
                  <CompRow feature="Full bot access" license inst />
                  <CompRow feature="Custom risk parameters" license inst />
                  <CompRow feature="API access" inst />
                  <CompRow feature="White-label" inst />
                  <CompRow feature="Priority support" pro license inst />
                  <CompRow feature="Dedicated account manager" inst />
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* CMS tiers */}
        {tiers.length > 0 && (
          <section className="section-padding border-b border-white/8">
            <div className="container-default px-6">
              <p className="t-eyebrow mb-3">Plans</p>
              <h2 className="t-display-sub mb-12">All plans</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {tiers.map((tier) => {
                  const features = Array.isArray(tier.features) ? tier.features as string[] : [];
                  return (
                    <div key={tier.slug} className="card-enterprise flex flex-col">
                      <h3 className="text-xl font-medium">{tier.name}</h3>
                      {tier.subtitle && <p className="t-body-sm text-foreground/50 mt-1">{tier.subtitle}</p>}
                      <p className="font-mono text-2xl font-semibold mt-3 mb-6">{tier.price}</p>
                      <ul className="space-y-2.5 flex-1 mb-8">
                        {features.map((f, i) => <FeatureItem key={i}>{String(f)}</FeatureItem>)}
                      </ul>
                      <Link href={tier.ctaLink} className="btn-secondary w-full justify-center">
                        {tier.ctaLabel}
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Downloads */}
        <section className="section-padding">
          <div className="container-default px-6 text-center">
            <p className="t-body-sm text-foreground/50 mb-6">Download detailed factsheets for each product.</p>
            <div className="flex flex-wrap justify-center gap-6">
              <FactsheetLink label="Signal Factsheet" />
              <FactsheetLink label="PAMM Factsheet" />
              <FactsheetLink label="License Factsheet" />
              <FactsheetLink label="Institutional Brochure" />
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm text-foreground/70">
      <span className="text-emerald-400 mt-0.5 shrink-0">&#10003;</span>
      <span>{children}</span>
    </li>
  );
}

function CompRow({ feature, signal, pro, license, inst }: {
  feature: string;
  signal?: boolean;
  pro?: boolean;
  license?: boolean;
  inst?: boolean;
}) {
  return (
    <tr>
      <td className="!text-foreground/70 !font-body">{feature}</td>
      <td className="!text-center">{signal ? <Check /> : <Dash />}</td>
      <td className="!text-center">{pro ? <Check /> : <Dash />}</td>
      <td className="!text-center">{license ? <Check /> : <Dash />}</td>
      <td className="!text-center">{inst ? <Check /> : <Dash />}</td>
    </tr>
  );
}

function Check() {
  return <span className="text-emerald-400 font-mono">&#10003;</span>;
}

function Dash() {
  return <span className="text-foreground/20">&#8212;</span>;
}

function FactsheetLink({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-foreground/40 cursor-not-allowed">
      {label} (PDF)
      <ArrowRight className="w-3.5 h-3.5" />
    </span>
  );
}
