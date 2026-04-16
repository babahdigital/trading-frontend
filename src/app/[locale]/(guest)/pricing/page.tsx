import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { GuestNav } from '@/components/layout/guest-nav';
import { localizePricingTier } from '@/lib/i18n/localize-cms';

type Tier = Parameters<typeof localizePricingTier>[0];

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('pricing');
  return getPageMetadata('/pricing', {
    title: `${t('title')} — BabahAlgo`,
    description: 'Choose the right plan for your trading needs',
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
  } catch {}

  const fallbackTiers: typeof tiers = [
    { name: 'Signal Only', price: '$49/mo', subtitle: 'AI-powered signals', features: ['AI Signal Generation', 'Telegram Alerts', 'Basic Dashboard'], excluded: [], ctaLabel: t('cta'), ctaLink: '/register/signal', slug: 'signal' },
    { name: 'PAMM Account', price: '$199/mo', subtitle: 'Managed trading', features: ['Fully Managed Account', 'AI + Human Oversight', 'Monthly Reports', 'Priority Support'], excluded: [], ctaLabel: t('cta'), ctaLink: '/register/pamm', slug: 'pamm' },
    { name: 'VPS Enterprise', price: 'Custom', subtitle: 'Dedicated infrastructure', features: ['Dedicated VPS', 'Custom EA Deployment', 'SLA Guarantee', '24/7 Monitoring', 'White Glove Support'], excluded: [], ctaLabel: t('contact'), ctaLink: '/register/vps', slug: 'vps' },
  ];

  const displayTiers = tiers.length > 0 ? tiers : fallbackTiers;

  return (
    <div className="min-h-screen bg-background">
      <GuestNav activePath="/pricing" />
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayTiers.map((tier, i) => {
            const features = Array.isArray(tier.features) ? tier.features as string[] : [];
            const excluded = Array.isArray(tier.excluded) ? tier.excluded as string[] : [];
            const isPrimary = i === 1;

            return (
              <div key={tier.slug} className={`relative rounded-2xl border p-8 flex flex-col ${isPrimary ? 'border-primary bg-primary/5 shadow-lg scale-105' : 'border-border'}`}>
                {isPrimary && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    {t('most_popular')}
                  </div>
                )}
                <h3 className="text-xl font-bold">{tier.name}</h3>
                {tier.subtitle && <p className="text-sm text-muted-foreground mt-1">{tier.subtitle}</p>}
                <div className="text-3xl font-bold mt-4 mb-6">{tier.price}</div>
                <ul className="space-y-3 flex-1">
                  {features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 mt-0.5">&#10003;</span>
                      <span>{String(f)}</span>
                    </li>
                  ))}
                  {excluded.map((f, j) => (
                    <li key={`ex-${j}`} className="flex items-start gap-2 text-sm text-muted-foreground line-through">
                      <span className="mt-0.5">&#10007;</span>
                      <span>{String(f)}</span>
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaLink} className={`mt-6 block text-center py-3 rounded-lg font-medium transition-colors ${isPrimary ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'border border-border hover:bg-muted'}`}>
                  {tier.ctaLabel}
                </Link>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
