import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { TrustStrip } from '@/components/shared/trust-strip';
import { StickyCtaBar } from '@/components/shared/sticky-cta-bar';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { STRATEGY_ICONS } from '@/components/icons/strategy-icons';
import { getTranslations, getLocale } from 'next-intl/server';
import { getPageMetadata } from '@/lib/seo';
import { getStrategyStats, formatWinRate } from '@/lib/trading/strategy-stats';
import { getForexStrategies } from '@/lib/trading/trading-settings';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/platform/strategies',
    {
      title: isEn ? 'Trading Strategies — BabahAlgo' : 'Strategi Trading — BabahAlgo',
      description: isEn
        ? 'BabahAlgo institutional strategy library: Smart Money Concepts scalper + swing variants, Pivot Mean Reversion, and Quad Confluence. Three strategies are live in production; Quad Confluence is newly added — all with full audit trail.'
        : 'Library strategi institusional BabahAlgo: Smart Money Concepts varian scalper + swing, Pivot Mean Reversion, dan Quad Confluence. Tiga strategi live di produksi; Quad Confluence baru ditambahkan — semua dengan audit chain SHA-256.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

export default async function StrategiesPage() {
  const [t, statsPayload, strategies, locale] = await Promise.all([
    getTranslations('platform_strategies'),
    getStrategyStats(),
    getForexStrategies(),
    getLocale(),
  ]);
  const isEn = locale === 'en';
  const isPending = statsPayload.source === 'pending';
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="layout-container">
            <div className="hero-section-header">
              <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
              <h1 className="t-display-page mb-6">
                {t('hero_title')}
              </h1>
              <p className="text-foreground/60 leading-relaxed mb-3">
                {t('hero_lead')}
              </p>
              <p className="text-xs text-foreground/50 italic mb-8">
                {t('hero_disclaimer')}
              </p>
              <div className="mb-2">
                <TrustStrip />
              </div>
            </div>
          </div>
        </section>

        {/* Strategies list */}
        <section className="section-padding border-b border-white/8">
          <div className="layout-container">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <p className="t-eyebrow">{t('list_eyebrow')}</p>
              {isPending ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-500/30 bg-amber-500/[0.06] text-[10px] font-medium text-amber-400 uppercase tracking-wider">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400/80 animate-pulse" aria-hidden />
                  {t('stats_pending_badge')}
                </span>
              ) : null}
            </div>
            <div className="space-y-6">
              {strategies.map((strategy) => {
                const StrategyIcon = STRATEGY_ICONS[strategy.slug];
                const stat = statsPayload.stats[strategy.slug] ?? null;
                const wrLabel = stat ? formatWinRate(stat.winRate) : '—';
                return (
                <div key={strategy.slug} className="card-enterprise group">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                    <div className="flex items-center gap-4 min-w-0">
                      {StrategyIcon && (
                        <div className="icon-container shrink-0">
                          <StrategyIcon className="w-6 h-6" />
                        </div>
                      )}
                      <h2 className="t-display-sub group-hover:text-amber-400 break-words">
                        {strategy.name}
                      </h2>
                      {strategy.status === 'new' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/15 text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">
                          NEW
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 t-body-sm text-foreground/60 shrink-0">
                      <span className="font-mono">{strategy.timeframe}</span>
                      <span className={`font-mono ${wrLabel === '—' ? 'text-foreground/40' : 'text-amber-400'}`}>
                        {wrLabel} {t('wr_suffix')}
                      </span>
                    </div>
                  </div>
                  <p className="text-foreground/60 leading-relaxed mb-4">
                    {isEn ? strategy.desc_en : strategy.desc_id}
                  </p>
                  <Link
                    href={`/platform/strategies/${strategy.slug}`}
                    className="btn-tertiary text-sm"
                  >
                    {t('view_methodology')} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                );
              })}
            </div>
          </div>
        </section>

        <StrategiesStickyCta />
      </main>
      <EnterpriseFooter />
    </div>
  );
}

async function StrategiesStickyCta() {
  const ts = await getTranslations('shared');
  return (
    <StickyCtaBar
      message={ts('sticky_demo_text')}
      ctaLabel={ts('sticky_demo_cta')}
      href="/register?service=free"
    />
  );
}
