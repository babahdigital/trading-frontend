import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

const STRATEGY_SLUGS = ['smc', 'wyckoff', 'astronacci', 'ai-momentum', 'oil-gas', 'smc-swing'] as const;

type StrategySlug = (typeof STRATEGY_SLUGS)[number];

interface StrategyData {
  name: string;
  subtitleKey: string;
  abstractKeys: [string, string];
  mechanismKeys: string[];
  confluence: { timeframe: string; roleKey: string }[];
  riskProfile: {
    winRate: string;
    avgRR: string;
    avgHold: string;
    maxConsecutiveLoss: string;
  };
}

const STRATEGY_DATA: Record<StrategySlug, StrategyData> = {
  smc: {
    name: 'SMC Intraday',
    subtitleKey: 'smc_subtitle',
    abstractKeys: ['smc_abstract_1', 'smc_abstract_2'],
    mechanismKeys: [
      'smc_mechanism_1',
      'smc_mechanism_2',
      'smc_mechanism_3',
      'smc_mechanism_4',
      'smc_mechanism_5',
      'smc_mechanism_6',
    ],
    confluence: [
      { timeframe: 'H4', roleKey: 'smc_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'smc_confluence_2_role' },
      { timeframe: 'M15', roleKey: 'smc_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'smc_confluence_4_role' },
    ],
    riskProfile: {
      winRate: '62%',
      avgRR: '1:1.8',
      avgHold: '1h 45m',
      maxConsecutiveLoss: '5',
    },
  },
  wyckoff: {
    name: 'Wyckoff Accumulation-Distribution',
    subtitleKey: 'wyckoff_subtitle',
    abstractKeys: ['wyckoff_abstract_1', 'wyckoff_abstract_2'],
    mechanismKeys: [
      'wyckoff_mechanism_1',
      'wyckoff_mechanism_2',
      'wyckoff_mechanism_3',
      'wyckoff_mechanism_4',
      'wyckoff_mechanism_5',
      'wyckoff_mechanism_6',
    ],
    confluence: [
      { timeframe: 'H4', roleKey: 'wyckoff_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'wyckoff_confluence_2_role' },
      { timeframe: 'M15', roleKey: 'wyckoff_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'wyckoff_confluence_4_role' },
    ],
    riskProfile: {
      winRate: '58%',
      avgRR: '1:2.2',
      avgHold: '3h 10m',
      maxConsecutiveLoss: '4',
    },
  },
  astronacci: {
    name: 'Astronacci Harmonic',
    subtitleKey: 'astronacci_subtitle',
    abstractKeys: ['astronacci_abstract_1', 'astronacci_abstract_2'],
    mechanismKeys: [
      'astronacci_mechanism_1',
      'astronacci_mechanism_2',
      'astronacci_mechanism_3',
      'astronacci_mechanism_4',
      'astronacci_mechanism_5',
      'astronacci_mechanism_6',
    ],
    confluence: [
      { timeframe: 'H4', roleKey: 'astronacci_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'astronacci_confluence_2_role' },
      { timeframe: 'M15', roleKey: 'astronacci_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'astronacci_confluence_4_role' },
    ],
    riskProfile: {
      winRate: '55%',
      avgRR: '1:2.5',
      avgHold: '2h 50m',
      maxConsecutiveLoss: '6',
    },
  },
  'ai-momentum': {
    name: 'AI Momentum',
    subtitleKey: 'ai-momentum_subtitle',
    abstractKeys: ['ai-momentum_abstract_1', 'ai-momentum_abstract_2'],
    mechanismKeys: [
      'ai-momentum_mechanism_1',
      'ai-momentum_mechanism_2',
      'ai-momentum_mechanism_3',
      'ai-momentum_mechanism_4',
      'ai-momentum_mechanism_5',
      'ai-momentum_mechanism_6',
    ],
    confluence: [
      { timeframe: 'H4', roleKey: 'ai-momentum_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'ai-momentum_confluence_2_role' },
      { timeframe: 'M15', roleKey: 'ai-momentum_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'ai-momentum_confluence_4_role' },
    ],
    riskProfile: {
      winRate: '64%',
      avgRR: '1:1.6',
      avgHold: '1h 20m',
      maxConsecutiveLoss: '4',
    },
  },
  'oil-gas': {
    name: 'Oil & Gas Macro',
    subtitleKey: 'oil-gas_subtitle',
    abstractKeys: ['oil-gas_abstract_1', 'oil-gas_abstract_2'],
    mechanismKeys: [
      'oil-gas_mechanism_1',
      'oil-gas_mechanism_2',
      'oil-gas_mechanism_3',
      'oil-gas_mechanism_4',
      'oil-gas_mechanism_5',
      'oil-gas_mechanism_6',
    ],
    confluence: [
      { timeframe: 'H4', roleKey: 'oil-gas_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'oil-gas_confluence_2_role' },
      { timeframe: 'M15', roleKey: 'oil-gas_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'oil-gas_confluence_4_role' },
    ],
    riskProfile: {
      winRate: '57%',
      avgRR: '1:2.1',
      avgHold: '2h 30m',
      maxConsecutiveLoss: '5',
    },
  },
  'smc-swing': {
    name: 'SMC Swing',
    subtitleKey: 'smc-swing_subtitle',
    abstractKeys: ['smc-swing_abstract_1', 'smc-swing_abstract_2'],
    mechanismKeys: [
      'smc-swing_mechanism_1',
      'smc-swing_mechanism_2',
      'smc-swing_mechanism_3',
      'smc-swing_mechanism_4',
      'smc-swing_mechanism_5',
      'smc-swing_mechanism_6',
    ],
    confluence: [
      { timeframe: 'W1/D1', roleKey: 'smc-swing_confluence_1_role' },
      { timeframe: 'H4', roleKey: 'smc-swing_confluence_2_role' },
      { timeframe: 'H1', roleKey: 'smc-swing_confluence_3_role' },
      { timeframe: 'M15', roleKey: 'smc-swing_confluence_4_role' },
    ],
    riskProfile: {
      winRate: '53%',
      avgRR: '1:2.8',
      avgHold: '3h 40m',
      maxConsecutiveLoss: '6',
    },
  },
};

function getAdjacentStrategies(slug: StrategySlug) {
  const idx = STRATEGY_SLUGS.indexOf(slug);
  const prev = idx > 0 ? STRATEGY_SLUGS[idx - 1] : null;
  const next = idx < STRATEGY_SLUGS.length - 1 ? STRATEGY_SLUGS[idx + 1] : null;
  return {
    prev: prev ? { slug: prev, name: STRATEGY_DATA[prev].name } : null,
    next: next ? { slug: next, name: STRATEGY_DATA[next].name } : null,
  };
}

export async function generateStaticParams() {
  return STRATEGY_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await getTranslations('platform_strategy_detail');
  if (!STRATEGY_SLUGS.includes(slug as StrategySlug)) {
    return { title: t('not_found_title') };
  }
  const strategy = STRATEGY_DATA[slug as StrategySlug];
  const description = t(strategy.abstractKeys[0]).slice(0, 160);
  return {
    title: `${strategy.name} ${t('metadata_title_suffix')}`,
    description,
    openGraph: {
      title: `${strategy.name} ${t('metadata_og_suffix')}`,
      description,
      type: 'article',
    },
  };
}

export default async function StrategyDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!STRATEGY_SLUGS.includes(slug as StrategySlug)) {
    notFound();
  }

  const t = await getTranslations('platform_strategy_detail');
  const strategy = STRATEGY_DATA[slug as StrategySlug];
  const { prev, next } = getAdjacentStrategies(slug as StrategySlug);

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Platform', url: '/platform' },
    { name: 'Strategies', url: '/platform/strategies' },
    { name: strategy.name, url: `/platform/strategies/${slug}` },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        {/* Back link */}
        <Link
          href="/platform/strategies"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> {t('back_link')}
        </Link>

        {/* Header */}
        <h1 className="font-display text-display-lg md:text-display-xl text-foreground mb-3">
          {strategy.name}
        </h1>
        <p className="text-muted-foreground leading-relaxed mb-12 text-lg">
          {t(strategy.subtitleKey)}
        </p>

        {/* Abstract */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            {t('section_abstract')}
          </h2>
          {strategy.abstractKeys.map((key, i) => (
            <p key={i} className="text-muted-foreground leading-relaxed mb-6">
              {t(key)}
            </p>
          ))}
        </section>

        {/* Mechanism */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            {t('section_mechanism')}
          </h2>
          <div className="space-y-4">
            {strategy.mechanismKeys.map((key, i) => (
              <div key={i} className="border border-border rounded-lg p-8 bg-card">
                <div className="flex gap-4">
                  <span className="font-mono text-accent text-sm font-semibold shrink-0">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-sm">
                    {t(key)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Multi-timeframe confluence */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            {t('section_confluence')}
          </h2>
          <p className="text-muted-foreground leading-relaxed mb-6">
            {t('section_confluence_lead')}
          </p>
          <div className="border border-border rounded-lg bg-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-3">
                    {t('table_timeframe')}
                  </th>
                  <th className="text-left text-sm font-semibold text-foreground px-6 py-3">
                    {t('table_role')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {strategy.confluence.map((row) => (
                  <tr key={row.timeframe} className="border-b border-border last:border-0">
                    <td className="font-mono text-sm text-accent px-6 py-3">
                      {row.timeframe}
                    </td>
                    <td className="text-sm text-muted-foreground px-6 py-3">
                      {t(row.roleKey)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Risk profile */}
        <section className="mb-16">
          <h2 className="font-display text-display-sm text-foreground mb-4">
            {t('section_risk_profile')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: t('metric_win_rate'), value: strategy.riskProfile.winRate },
              { label: t('metric_avg_rr'), value: strategy.riskProfile.avgRR },
              { label: t('metric_avg_hold'), value: strategy.riskProfile.avgHold },
              { label: t('metric_max_consec_loss'), value: strategy.riskProfile.maxConsecutiveLoss },
            ].map((metric) => (
              <div key={metric.label} className="border border-border rounded-lg p-8 bg-card text-center">
                <p className="font-mono text-xl text-accent mb-1">{metric.value}</p>
                <p className="text-xs text-muted-foreground">{metric.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Navigation */}
        <section className="flex items-center justify-between pt-8 border-t border-border">
          <div>
            {prev && (
              <Link
                href={`/platform/strategies/${prev.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> {prev.name}
              </Link>
            )}
          </div>
          <div>
            {next && (
              <Link
                href={`/platform/strategies/${next.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                {next.name} <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
