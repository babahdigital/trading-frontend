import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { notFound } from 'next/navigation';
import { breadcrumbSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { getTranslations } from 'next-intl/server';
import {
  getStrategyStats,
  formatWinRate,
  formatRR,
  formatHoldMinutes,
  formatCount,
} from '@/lib/trading/strategy-stats';
import { getForexStrategies } from '@/lib/trading/trading-settings';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

// Prose i18n keys for mechanism/confluence remain hardcoded — these are long-form
// content that lives in the i18n message files, not in the CMS trading settings.
type StrategySlug = 'smc' | 'smc-swing' | 'pivot-mean-reversion' | 'quad-confluence';

interface StrategyData {
  name: string;
  subtitleKey: string;
  abstractKeys: [string, string];
  mechanismKeys: string[];
  confluence: { timeframe: string; roleKey: string }[];
}

const STRATEGY_DATA: Record<StrategySlug, StrategyData> = {
  smc: {
    name: 'SMC Scalper',
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
  },
  'pivot-mean-reversion': {
    name: 'Pivot Mean Reversion',
    subtitleKey: 'pivot-mean-reversion_subtitle',
    abstractKeys: ['pivot-mean-reversion_abstract_1', 'pivot-mean-reversion_abstract_2'],
    mechanismKeys: [
      'pivot-mean-reversion_mechanism_1',
      'pivot-mean-reversion_mechanism_2',
      'pivot-mean-reversion_mechanism_3',
      'pivot-mean-reversion_mechanism_4',
      'pivot-mean-reversion_mechanism_5',
      'pivot-mean-reversion_mechanism_6',
    ],
    confluence: [
      { timeframe: 'D1', roleKey: 'pivot-mean-reversion_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'pivot-mean-reversion_confluence_2_role' },
      { timeframe: 'M15', roleKey: 'pivot-mean-reversion_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'pivot-mean-reversion_confluence_4_role' },
    ],
  },
  'quad-confluence': {
    name: 'Quad Confluence',
    subtitleKey: 'quad-confluence_subtitle',
    abstractKeys: ['quad-confluence_abstract_1', 'quad-confluence_abstract_2'],
    mechanismKeys: [
      'quad-confluence_mechanism_1',
      'quad-confluence_mechanism_2',
      'quad-confluence_mechanism_3',
      'quad-confluence_mechanism_4',
      'quad-confluence_mechanism_5',
      'quad-confluence_mechanism_6',
    ],
    confluence: [
      { timeframe: 'H4', roleKey: 'quad-confluence_confluence_1_role' },
      { timeframe: 'H1', roleKey: 'quad-confluence_confluence_2_role' },
      { timeframe: 'M30', roleKey: 'quad-confluence_confluence_3_role' },
      { timeframe: 'M5', roleKey: 'quad-confluence_confluence_4_role' },
    ],
  },
};

function getAdjacentStrategies(
  slug: string,
  allSlugs: string[],
  nameMap: Map<string, string>,
) {
  const idx = allSlugs.indexOf(slug);
  const prev = idx > 0 ? allSlugs[idx - 1] : null;
  const next = idx < allSlugs.length - 1 ? allSlugs[idx + 1] : null;
  return {
    prev: prev ? { slug: prev, name: nameMap.get(prev) ?? prev } : null,
    next: next ? { slug: next, name: nameMap.get(next) ?? next } : null,
  };
}

export async function generateStaticParams() {
  const strategies = await getForexStrategies();
  return strategies.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [t, strategies] = await Promise.all([
    getTranslations('platform_strategy_detail'),
    getForexStrategies(),
  ]);
  const dbStrategy = strategies.find((s) => s.slug === slug);
  if (!dbStrategy) {
    return { title: t('not_found_title') };
  }
  const proseData = STRATEGY_DATA[slug as StrategySlug];
  const description = proseData
    ? t(proseData.abstractKeys[0]).slice(0, 160)
    : dbStrategy.desc_en.slice(0, 160);
  return {
    title: `${dbStrategy.name} ${t('metadata_title_suffix')}`,
    description,
    openGraph: {
      title: `${dbStrategy.name} ${t('metadata_og_suffix')}`,
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

  const [t, statsPayload, strategies] = await Promise.all([
    getTranslations('platform_strategy_detail'),
    getStrategyStats(),
    getForexStrategies(),
  ]);

  const dbStrategy = strategies.find((s) => s.slug === slug);
  if (!dbStrategy) {
    notFound();
  }

  // Prose data for mechanism/confluence — only available for known slugs
  const proseData = (slug in STRATEGY_DATA) ? STRATEGY_DATA[slug as StrategySlug] : null;
  const stat = statsPayload.stats[slug] ?? null;
  const isPending = statsPayload.source === 'pending' || stat === null;

  const allSlugs = strategies.map((s) => s.slug);
  const nameMap = new Map(strategies.map((s) => [s.slug, s.name]));
  const { prev, next } = getAdjacentStrategies(slug, allSlugs, nameMap);

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Platform', url: '/platform' },
    { name: 'Strategies', url: '/platform/strategies' },
    { name: dbStrategy.name, url: `/platform/strategies/${slug}` },
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <Link
              href="/platform/strategies"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> {t('back_link')}
            </Link>
            <div className="hero-section-header">
              <h1 className="t-display-page mb-4">
                {dbStrategy.name}
              </h1>
              {proseData && (
                <p className="t-lead text-muted-foreground">
                  {t(proseData.subtitleKey)}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Abstract */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('section_abstract')}</p>
            <div className="max-w-3xl">
              {proseData ? (
                proseData.abstractKeys.map((key, i) => (
                  <p key={i} className="t-body text-muted-foreground leading-relaxed mb-6 last:mb-0">
                    {t(key)}
                  </p>
                ))
              ) : (
                <p className="t-body text-muted-foreground leading-relaxed">
                  {dbStrategy.desc_en}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Mechanism */}
        {proseData && (
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('section_mechanism')}</p>
            <h2 className="t-display-sub mb-8">{dbStrategy.name}</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {proseData.mechanismKeys.map((key, i) => (
                <div key={i} className="card-enterprise">
                  <div className="flex gap-4">
                    <span className="font-mono text-accent text-sm font-semibold shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <p className="t-body-sm text-muted-foreground leading-relaxed">
                      {t(key)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {/* Multi-timeframe confluence */}
        {proseData && (
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-3">{t('section_confluence')}</p>
            <h2 className="t-display-sub mb-4">{t('section_confluence')}</h2>
            <p className="t-body text-muted-foreground max-w-2xl mb-8">
              {t('section_confluence_lead')}
            </p>
            <div className="border border-border rounded-xl bg-card overflow-hidden max-w-2xl">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                      {t('table_timeframe')}
                    </th>
                    <th className="text-left text-sm font-semibold text-foreground px-6 py-4">
                      {t('table_role')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {proseData.confluence.map((row) => (
                    <tr key={row.timeframe} className="border-b border-border last:border-0">
                      <td className="font-mono text-sm text-accent px-6 py-4">
                        {row.timeframe}
                      </td>
                      <td className="text-sm text-muted-foreground px-6 py-4">
                        {t(row.roleKey)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
        )}

        {/* Risk profile */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
              <div>
                <p className="t-eyebrow mb-3">{t('section_risk_profile')}</p>
                <h2 className="t-display-sub">{t('section_risk_profile')}</h2>
              </div>
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/[0.06] text-[10px] font-medium text-amber-400 uppercase tracking-wider">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/80 animate-pulse" aria-hidden />
                  {t('stats_pending_badge')}
                </span>
              ) : stat?.lastUpdated ? (
                <span className="text-[11px] text-muted-foreground">
                  {t('stats_updated_at', { ts: new Date(stat.lastUpdated).toLocaleString() })}
                </span>
              ) : null}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
              {[
                { label: t('metric_win_rate'), value: formatWinRate(stat?.winRate ?? null) },
                { label: t('metric_avg_rr'), value: formatRR(stat?.avgRR ?? null) },
                { label: t('metric_avg_hold'), value: formatHoldMinutes(stat?.avgHoldMinutes ?? null) },
                { label: t('metric_max_consec_loss'), value: formatCount(stat?.maxConsecutiveLoss ?? null) },
              ].map((metric) => (
                <div key={metric.label} className="kpi-card">
                  <p className="t-eyebrow mb-3">{metric.label}</p>
                  <p className={`font-mono text-2xl ${metric.value === '—' ? 'text-foreground/40' : 'text-accent'}`}>
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>
            {isPending ? (
              <p className="mt-6 text-xs text-muted-foreground italic max-w-2xl">
                {t('stats_pending_note')}
              </p>
            ) : null}
          </div>
        </section>

        {/* Navigation */}
        <section className="section-padding">
          <div className="layout-container">
            <div className="flex items-center justify-between pt-4 border-t border-border">
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
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
