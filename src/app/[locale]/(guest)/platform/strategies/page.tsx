import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { STRATEGY_ICONS } from '@/components/icons/strategy-icons';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const STRATEGIES = [
  {
    slug: 'smc',
    nameKey: 'smc_name',
    descKey: 'smc_desc',
    timeframe: 'M5 — H1',
    winRate: '62%',
  },
  {
    slug: 'wyckoff',
    nameKey: 'wyckoff_name',
    descKey: 'wyckoff_desc',
    timeframe: 'M15 — H4',
    winRate: '58%',
  },
  {
    slug: 'astronacci',
    nameKey: 'astronacci_name',
    descKey: 'astronacci_desc',
    timeframe: 'H1 — H4',
    winRate: '55%',
  },
  {
    slug: 'ai-momentum',
    nameKey: 'ai-momentum_name',
    descKey: 'ai-momentum_desc',
    timeframe: 'M15 — H1',
    winRate: '64%',
  },
  {
    slug: 'oil-gas',
    nameKey: 'oil-gas_name',
    descKey: 'oil-gas_desc',
    timeframe: 'H1 — H4',
    winRate: '57%',
  },
  {
    slug: 'smc-swing',
    nameKey: 'smc-swing_name',
    descKey: 'smc-swing_desc',
    timeframe: 'H4 — D1',
    winRate: '53%',
  },
] as const;

export default async function StrategiesPage() {
  const t = await getTranslations('platform_strategies');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-3 max-w-2xl">
              {t('hero_lead')}
            </p>
            <p className="text-xs text-foreground/50 italic max-w-2xl mb-8">
              {t('hero_disclaimer')}
            </p>
          </div>
        </section>

        {/* Strategies list */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('list_eyebrow')}</p>
            <div className="space-y-6">
              {STRATEGIES.map((strategy) => {
                const StrategyIcon = STRATEGY_ICONS[strategy.slug];
                return (
                <div key={strategy.slug} className="card-enterprise group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-4">
                      {StrategyIcon && (
                        <div className="icon-container shrink-0">
                          <StrategyIcon className="w-6 h-6" />
                        </div>
                      )}
                      <h2 className="t-display-sub group-hover:text-amber-400">
                        {t(strategy.nameKey)}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 t-body-sm text-foreground/60">
                      <span className="font-mono">{strategy.timeframe}</span>
                      <span className="font-mono text-amber-400">{strategy.winRate} {t('wr_suffix')}</span>
                    </div>
                  </div>
                  <p className="text-foreground/60 leading-relaxed mb-4">
                    {t(strategy.descKey)}
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

      </main>
      <EnterpriseFooter />
    </div>
  );
}
