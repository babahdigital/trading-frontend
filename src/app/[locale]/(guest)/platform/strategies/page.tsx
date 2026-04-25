import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { STRATEGY_ICONS } from '@/components/icons/strategy-icons';

export const dynamic = 'force-dynamic';

const STRATEGIES = [
  {
    slug: 'smc',
    name: 'SMC Intraday',
    description:
      'Smart Money Concepts applied to intraday timeframes. Identifies institutional order flow through order blocks, fair value gaps, and liquidity sweeps. Targets high-probability entries where retail liquidity is harvested by institutional participants.',
    timeframe: 'M5 -- H1',
    winRate: '62%',
  },
  {
    slug: 'wyckoff',
    name: 'Wyckoff Accumulation-Distribution',
    description:
      'Classical Wyckoff methodology automated for modern markets. Detects accumulation and distribution phases through volume-price analysis, spring/upthrust identification, and phase transition confirmation.',
    timeframe: 'M15 -- H4',
    winRate: '58%',
  },
  {
    slug: 'astronacci',
    name: 'Astronacci Harmonic',
    description:
      'Proprietary harmonic geometry framework combining Fibonacci confluence zones with astro-cyclical timing windows. Identifies high-probability reversal points through multi-layer geometric alignment.',
    timeframe: 'H1 -- H4',
    winRate: '55%',
  },
  {
    slug: 'ai-momentum',
    name: 'AI Momentum',
    description:
      'Machine learning-driven momentum classification using Gemini 2.5 Flash for real-time sentiment and structure analysis. Combines AI confidence scoring with traditional momentum indicators for trend continuation entries.',
    timeframe: 'M15 -- H1',
    winRate: '64%',
  },
  {
    slug: 'oil-gas',
    name: 'Oil & Gas Macro',
    description:
      'Energy-sector specialist strategy for USOIL, UKOIL, and XNGUSD. Integrates inventory data cycles, geopolitical risk scoring, and seasonal demand patterns with technical confluence for macro-driven entries.',
    timeframe: 'H1 -- H4',
    winRate: '57%',
  },
  {
    slug: 'smc-swing',
    name: 'SMC Swing',
    description:
      'Multi-day Smart Money positioning targeting higher-timeframe order blocks and liquidity pools. Designed for larger moves with wider stops, lower frequency, and higher reward-to-risk ratios.',
    timeframe: 'H4 -- D1',
    winRate: '53%',
  },
];

export default async function StrategiesPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Strategy Framework</p>
            <h1 className="t-display-page mb-6">
              Strategy framework
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              Six independently validated strategies, each operating on a strict
              multi-timeframe confluence model. Every strategy is backtested across a
              minimum of 24 months of historical data and validated through walk-forward
              analysis before deployment.
            </p>
          </div>
        </section>

        {/* Strategies list */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Active Strategies</p>
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
                        {strategy.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-4 t-body-sm text-foreground/60">
                      <span className="font-mono">{strategy.timeframe}</span>
                      <span className="font-mono text-amber-400">{strategy.winRate} WR</span>
                    </div>
                  </div>
                  <p className="text-foreground/60 leading-relaxed mb-4">
                    {strategy.description}
                  </p>
                  <Link
                    href={`/platform/strategies/${strategy.slug}`}
                    className="btn-tertiary text-sm"
                  >
                    View full methodology <ArrowRight className="w-3.5 h-3.5" />
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
