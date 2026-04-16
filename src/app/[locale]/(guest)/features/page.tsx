import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { GuestNav } from '@/components/layout/guest-nav';
import { Link } from '@/i18n/navigation';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('features');
  return getPageMetadata('/features', {
    title: `${t('title')} — BabahAlgo`,
    description: 'Explore the powerful features of BabahAlgo AI trading platform',
  });
}

const features = [
  { title: 'AI Signal Engine', desc: 'Multi-model ensemble combining LSTM, Transformer, and gradient-boosted trees for high-probability trade signals across forex, gold, and indices.', icon: '🤖' },
  { title: 'Real-Time Execution', desc: 'Sub-millisecond order routing via MT5 bridge with smart order management, partial fills, and slippage protection.', icon: '⚡' },
  { title: 'Risk Management', desc: 'Dynamic position sizing with Kelly Criterion optimization. Max drawdown limits, correlation-aware exposure caps, and automatic kill switch.', icon: '🛡️' },
  { title: 'Portfolio Analytics', desc: 'Real-time equity curves, Sharpe ratio tracking, Monte Carlo simulations, and comprehensive performance attribution dashboards.', icon: '📊' },
  { title: 'Multi-Strategy', desc: 'Deploy and blend multiple strategies including trend following, mean reversion, breakout, and statistical arbitrage — all managed from one dashboard.', icon: '🎯' },
  { title: 'Institutional Infrastructure', desc: 'Dedicated VPS with 99.9% SLA, redundant connectivity, hardware-level isolation, and automated failover.', icon: '🏢' },
  { title: 'Telegram Integration', desc: 'Instant trade notifications, daily P&L summaries, and alert management directly through Telegram bots.', icon: '📱' },
  { title: 'White-Glove Support', desc: 'Dedicated account manager, custom EA deployment, strategy consultation, and priority technical support for enterprise clients.', icon: '🤝' },
];

export default async function FeaturesPage() {
  const t = await getTranslations('features');
  const tPricing = await getTranslations('pricing');

  return (
    <div className="min-h-screen bg-background">
      <GuestNav activePath="/features" />
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4">{t('title')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('subtitle')}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.title} className="border border-border rounded-xl p-6 hover:border-primary/50 transition-colors">
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="text-lg font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link href="/pricing" className="inline-block px-8 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
            {tPricing('title')}
          </Link>
        </div>
      </main>
    </div>
  );
}
