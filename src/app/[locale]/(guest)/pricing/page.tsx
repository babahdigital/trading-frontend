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

      <main className="max-w-6xl mx-auto px-6 py-20">
        {/* Hero */}
        <div className="text-center mb-20">
          <h1 className="font-display text-display-md md:text-display-lg text-foreground mb-4">
            {t('title')}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* 3 Audience Columns */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {/* Individual */}
          <div className="border border-border rounded-lg p-8 bg-card flex flex-col">
            <h3 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Individual</h3>
            <h4 className="font-display text-xl font-semibold text-foreground mb-1">Signal Service</h4>
            <div className="font-mono text-3xl font-semibold text-foreground mb-1">$49-149<span className="text-base text-muted-foreground">/mo</span></div>
            <p className="text-sm text-muted-foreground mb-6">AI-powered trading signals delivered to your dashboard and Telegram.</p>
            <ul className="space-y-2 flex-1 mb-8">
              <FeatureItem>Real-time AI signal generation</FeatureItem>
              <FeatureItem>Dashboard with performance metrics</FeatureItem>
              <FeatureItem>Telegram VIP alerts (VIP tier)</FeatureItem>
              <FeatureItem>Daily performance reports</FeatureItem>
            </ul>
            <Link
              href="/solutions/signal"
              className="block text-center py-3 text-sm font-medium rounded-md border border-border hover:bg-secondary transition-colors"
            >
              {t('cta')}
            </Link>
          </div>

          {/* Professional */}
          <div className="border border-border rounded-lg p-8 bg-card flex flex-col">
            <h3 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Professional</h3>
            <h4 className="font-display text-xl font-semibold text-foreground mb-1">PAMM / VPS License</h4>
            <div className="font-mono text-3xl font-semibold text-foreground mb-1">20-30%<span className="text-base text-muted-foreground"> share</span></div>
            <p className="text-sm text-muted-foreground mb-2">Managed trading or dedicated infrastructure.</p>
            <div className="text-xs text-muted-foreground mb-6">VPS License: from $3,000 setup + $150/mo</div>
            <ul className="space-y-2 flex-1 mb-8">
              <FeatureItem>Fully managed PAMM account</FeatureItem>
              <FeatureItem>Dedicated VPS with full bot access</FeatureItem>
              <FeatureItem>Advanced dashboard and reports</FeatureItem>
              <FeatureItem>Priority support channel</FeatureItem>
            </ul>
            <Link
              href="/solutions/pamm"
              className="block text-center py-3 text-sm font-medium rounded-md border border-border hover:bg-secondary transition-colors"
            >
              {t('cta')}
            </Link>
          </div>

          {/* Institutional */}
          <div className="border border-border rounded-lg p-8 bg-card flex flex-col">
            <h3 className="text-label-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">Institutional</h3>
            <h4 className="font-display text-xl font-semibold text-foreground mb-1">Managed Account</h4>
            <div className="font-mono text-3xl font-semibold text-foreground mb-1">Custom</div>
            <p className="text-sm text-muted-foreground mb-6">Custom mandate, API access, white-label. Starting AUM: $250K.</p>
            <ul className="space-y-2 flex-1 mb-8">
              <FeatureItem>Custom mandate and risk parameters</FeatureItem>
              <FeatureItem>API access for integration</FeatureItem>
              <FeatureItem>White-label option</FeatureItem>
              <FeatureItem>Dedicated quant team contact</FeatureItem>
              <FeatureItem>IMA and compliance documentation</FeatureItem>
            </ul>
            <Link
              href="/contact"
              className="block text-center py-3 text-sm font-medium rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {t('contact')}
            </Link>
          </div>
        </div>

        {/* Comparison table */}
        <div className="mb-20">
          <h2 className="font-display text-display-sm text-foreground mb-8">Feature comparison</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-card">
                  <th className="text-left p-4 font-medium text-muted-foreground">Feature</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Signal</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">PAMM</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">License</th>
                  <th className="text-center p-4 font-medium text-muted-foreground">Institutional</th>
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

        {/* CMS tiers (if admin added extra ones) */}
        {tiers.length > 0 && (
          <div className="mb-20">
            <h2 className="font-display text-display-sm text-foreground mb-8">All plans</h2>
            <div className="grid md:grid-cols-3 gap-8">
              {tiers.map((tier) => {
                const features = Array.isArray(tier.features) ? tier.features as string[] : [];
                return (
                  <div key={tier.slug} className="border border-border rounded-lg p-8 bg-card flex flex-col">
                    <h3 className="font-display text-xl font-semibold">{tier.name}</h3>
                    {tier.subtitle && <p className="text-sm text-muted-foreground mt-1">{tier.subtitle}</p>}
                    <div className="font-mono text-2xl font-semibold mt-3 mb-6">{tier.price}</div>
                    <ul className="space-y-2 flex-1 mb-8">
                      {features.map((f, i) => <FeatureItem key={i}>{String(f)}</FeatureItem>)}
                    </ul>
                    <Link
                      href={tier.ctaLink}
                      className="block text-center py-3 text-sm font-medium rounded-md border border-border hover:bg-secondary transition-colors"
                    >
                      {tier.ctaLabel}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Download */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">Download detailed factsheets for each product.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <FactsheetLink label="Signal Factsheet" />
            <FactsheetLink label="PAMM Factsheet" />
            <FactsheetLink label="License Factsheet" />
            <FactsheetLink label="Institutional Brochure" />
          </div>
        </div>
      </main>

      <EnterpriseFooter />
    </div>
  );
}

function FeatureItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-sm text-foreground/80">
      <span className="text-profit mt-0.5 shrink-0">&#10003;</span>
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
    <tr className="border-b border-border last:border-0">
      <td className="p-4 text-foreground/80">{feature}</td>
      <td className="text-center p-4">{signal ? <Check /> : <Dash />}</td>
      <td className="text-center p-4">{pro ? <Check /> : <Dash />}</td>
      <td className="text-center p-4">{license ? <Check /> : <Dash />}</td>
      <td className="text-center p-4">{inst ? <Check /> : <Dash />}</td>
    </tr>
  );
}

function Check() {
  return <span className="text-profit font-mono">&#10003;</span>;
}

function Dash() {
  return <span className="text-muted-foreground">&#8212;</span>;
}

function FactsheetLink({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground cursor-not-allowed">
      {label} (PDF)
      <ArrowRight className="w-3.5 h-3.5" />
    </span>
  );
}
