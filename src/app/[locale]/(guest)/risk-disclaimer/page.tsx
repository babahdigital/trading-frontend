import { getPageMetadata } from '@/lib/seo';
import { getTranslations } from 'next-intl/server';
import { GuestNav } from '@/components/layout/guest-nav';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = await getTranslations('risk_disclaimer');
  return getPageMetadata('/risk-disclaimer', {
    title: `${t('title')} — BabahAlgo`,
    description: 'Important risk disclosures for BabahAlgo trading services',
  });
}

export default async function RiskDisclaimerPage() {
  const t = await getTranslations('risk_disclaimer');

  return (
    <div className="min-h-screen bg-background">
      <GuestNav />
      <main className="max-w-4xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-8">{t('title')}</h1>

        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 mb-8">
          <p className="text-yellow-200 font-semibold text-lg">
            Trading foreign exchange and CFDs involves a high level of risk and may not be suitable for all investors.
            You could sustain a loss of some or all of your invested capital.
          </p>
        </div>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <h2 className="text-xl font-semibold text-foreground">General Risk Warning</h2>
          <p>Foreign exchange (forex) and Contracts for Difference (CFDs) are leveraged products that carry a high level of risk to your capital. Trading these instruments may result in the loss of your entire investment. These products may not be suitable for all investors. Ensure you fully understand the risks involved before trading.</p>

          <h2 className="text-xl font-semibold text-foreground">Past Performance</h2>
          <p>Past performance of BabahAlgo&apos;s AI trading systems is not indicative of future results. Historical returns, backtests, and simulated performance data are presented for informational purposes only. Market conditions change, and no algorithm can guarantee profits.</p>

          <h2 className="text-xl font-semibold text-foreground">No Financial Advice</h2>
          <p>BabahAlgo does not provide financial, investment, or tax advice. Our services are technological tools that execute trades based on algorithmic models. You should consult a qualified financial advisor before making investment decisions.</p>

          <h2 className="text-xl font-semibold text-foreground">Leverage Risk</h2>
          <p>Leveraged trading means both profits and losses are amplified. A small market movement can result in proportionally larger losses. Margin calls may require additional funds beyond your initial deposit.</p>

          <h2 className="text-xl font-semibold text-foreground">Technology Risk</h2>
          <p>Algorithmic trading systems depend on technology infrastructure including servers, networks, and software. System failures, connectivity issues, or software bugs may result in delayed or failed order execution.</p>

          <h2 className="text-xl font-semibold text-foreground">Market Risk</h2>
          <p>Financial markets can experience extreme volatility, gaps, and illiquidity during major economic events, geopolitical crises, or technical disruptions. These conditions may cause significant slippage or inability to close positions.</p>

          <h2 className="text-xl font-semibold text-foreground">Your Responsibility</h2>
          <p>By using BabahAlgo&apos;s services, you acknowledge that you understand these risks and accept full responsibility for your trading decisions and outcomes. Only trade with capital that you can afford to lose entirely.</p>
        </div>
      </main>
    </div>
  );
}
