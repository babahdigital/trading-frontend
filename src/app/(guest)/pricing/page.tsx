import { prisma } from '@/lib/db/prisma';
import { getPageMetadata } from '@/lib/seo';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getPageMetadata('/pricing', {
    title: 'Pricing — BabahAlgo',
    description: 'Choose the right plan for your trading needs',
  });
}

export default async function PricingPage() {
  let tiers: Array<{
    id: string; slug: string; name: string; price: string; subtitle: string | null;
    features: unknown; excluded: unknown; note: string | null; ctaLabel: string; ctaLink: string;
  }> = [];

  try {
    const raw = await prisma.pricingTier.findMany({ where: { isVisible: true }, orderBy: { sortOrder: 'asc' } });
    tiers = raw.map((t: { id: string; slug: string; name: string; price: string; subtitle: string | null; features: unknown; excluded: unknown; note: string | null; ctaLabel: string; ctaLink: string }) => ({
      id: t.id, slug: t.slug, name: t.name, price: t.price, subtitle: t.subtitle,
      features: t.features, excluded: t.excluded, note: t.note, ctaLabel: t.ctaLabel, ctaLink: t.ctaLink,
    }));
  } catch {}

  const fallbackTiers = [
    { name: 'Signal Only', price: '$49/mo', subtitle: 'AI-powered signals', features: ['AI Signal Generation', 'Telegram Alerts', 'Basic Dashboard'], excluded: [], ctaLabel: 'Get Started', ctaLink: '/register/signal', slug: 'signal' },
    { name: 'PAMM Account', price: '$199/mo', subtitle: 'Managed trading', features: ['Fully Managed Account', 'AI + Human Oversight', 'Monthly Reports', 'Priority Support'], excluded: [], ctaLabel: 'Get Started', ctaLink: '/register/pamm', slug: 'pamm' },
    { name: 'VPS Enterprise', price: 'Custom', subtitle: 'Dedicated infrastructure', features: ['Dedicated VPS', 'Custom EA Deployment', 'SLA Guarantee', '24/7 Monitoring', 'White Glove Support'], excluded: [], ctaLabel: 'Contact Us', ctaLink: '/register/vps', slug: 'vps' },
  ];

  const displayTiers = tiers.length > 0 ? tiers : fallbackTiers;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border/40 bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-primary">BabahAlgo</Link>
          <div className="flex items-center gap-4">
            <Link href="/features" className="text-sm text-muted-foreground hover:text-foreground">Features</Link>
            <Link href="/pricing" className="text-sm text-foreground font-medium">Pricing</Link>
            <Link href="/faq" className="text-sm text-muted-foreground hover:text-foreground">FAQ</Link>
            <Link href="/login" className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground">Login</Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Select the package that fits your trading goals. All plans include our core AI engine.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayTiers.map((tier, i) => {
            const features = Array.isArray(tier.features) ? tier.features as string[] : [];
            const excluded = Array.isArray('excluded' in tier ? tier.excluded : []) ? ('excluded' in tier ? tier.excluded : []) as string[] : [];
            const isPrimary = i === 1;

            return (
              <div key={'id' in tier ? tier.id : tier.slug} className={`relative rounded-2xl border p-8 flex flex-col ${isPrimary ? 'border-primary bg-primary/5 shadow-lg scale-105' : 'border-border'}`}>
                {isPrimary && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">
                    MOST POPULAR
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
                {'note' in tier && tier.note && <p className="text-xs text-muted-foreground mt-4">{tier.note}</p>}
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
