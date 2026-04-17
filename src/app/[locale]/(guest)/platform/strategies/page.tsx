import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

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
      <main className="max-w-4xl mx-auto px-6 py-20">
        <section className="mb-12">
          <h1 className="font-display text-display-lg md:text-display-xl text-foreground mb-6">
            Strategy framework
          </h1>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-2xl">
            Six independently validated strategies, each operating on a strict
            multi-timeframe confluence model. Every strategy is backtested across a
            minimum of 24 months of historical data and validated through walk-forward
            analysis before deployment.
          </p>
        </section>

        <div className="space-y-6">
          {STRATEGIES.map((strategy) => (
            <div
              key={strategy.slug}
              className="border border-border rounded-lg p-8 bg-card"
            >
              <div className="flex items-start justify-between mb-3">
                <h2 className="font-display text-xl text-foreground">
                  {strategy.name}
                </h2>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="font-mono">{strategy.timeframe}</span>
                  <span className="font-mono text-accent">{strategy.winRate} WR</span>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {strategy.description}
              </p>
              <Link
                href={`/platform/strategies/${strategy.slug}`}
                className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                View full methodology <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
