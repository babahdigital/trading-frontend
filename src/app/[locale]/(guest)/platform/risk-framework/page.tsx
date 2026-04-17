import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

const RISK_LAYERS = [
  {
    number: 1,
    name: 'Dynamic lot sizing',
    subtitle: 'Equity-aware position sizing',
    description:
      'Every trade is sized relative to current account equity, not the initial deposit. The system calculates the maximum allowable lot size based on the distance to the protective stop, the current equity balance, and the tier-specific risk-per-trade percentage (typically 0.5-1.5% of equity). As equity grows, position sizes scale proportionally. As equity declines, sizes contract automatically, creating a natural deceleration effect during drawdown periods. This prevents the compounding of losses that destroys accounts using fixed lot sizing.',
  },
  {
    number: 2,
    name: 'Catastrophic breaker',
    subtitle: 'Auto-stop at critical drawdown threshold',
    description:
      'If total account equity declines by a predefined percentage from its high-water mark (configurable per tier, typically 10-15%), the catastrophic breaker activates. Upon activation, all open positions are immediately closed at market, all pending orders are cancelled, and the strategy engine is disabled. The system enters a lockdown state that requires manual administrative intervention to resume. This layer exists to prevent catastrophic loss scenarios that could arise from correlated market events, infrastructure failures, or sustained adverse conditions.',
  },
  {
    number: 3,
    name: 'Daily loss limit',
    subtitle: 'Intraday drawdown ceiling',
    description:
      'A separate daily loss limit operates independently of the catastrophic breaker. If realized plus unrealized losses for the current trading day exceed the daily threshold (typically 2-3% of starting daily equity), all positions are closed and no new trades are permitted until the next trading day. This prevents a single bad day from consuming a disproportionate share of the monthly risk budget. The daily limit resets at 00:00 server time.',
  },
  {
    number: 4,
    name: 'Max positions per pair',
    subtitle: 'Single-instrument concentration limit',
    description:
      'No instrument may have more than one active position at any time. This prevents pyramiding into a single pair, which creates concentrated exposure to a single directional bet. If a strategy generates a new signal for a pair that already has an open position, the signal is logged but not executed. This rule has no exceptions -- it applies regardless of signal strength, AI confidence, or strategy type.',
  },
  {
    number: 5,
    name: 'Max total positions',
    subtitle: 'Portfolio-wide exposure limit',
    description:
      'The total number of simultaneously open positions is capped based on the account tier. Entry-tier accounts are limited to 3 concurrent positions. Professional tiers may allow up to 6. Institutional tiers up to 10. These limits ensure that total portfolio exposure remains within manageable bounds and that margin utilization does not approach critical levels. When the position limit is reached, new signals are queued and executed only when existing positions close.',
  },
  {
    number: 6,
    name: 'Protective stop',
    subtitle: 'Breakeven ratchet mechanism',
    description:
      'Every position has a protective stop-loss order placed immediately upon entry. The stop is calculated based on the strategy-specific methodology (e.g., beyond the order block for SMC, beyond the spring wick for Wyckoff). Once a position reaches 1R profit (unrealized profit equals the initial risk), the stop is ratcheted to breakeven plus spread. This ensures that a winning trade cannot become a losing trade after reaching its first profit milestone.',
  },
  {
    number: 7,
    name: 'News blackout',
    subtitle: 'High-impact event auto-pause',
    description:
      'The system maintains a calendar of high-impact economic events (NFP, FOMC, ECB, BOE decisions, CPI releases, GDP reports). During a configurable window surrounding each event (typically 15 minutes before to 5 minutes after), no new positions are opened for affected currency pairs. Existing positions are not closed automatically, but trailing stops are tightened. This prevents entering trades during periods of extreme volatility and unpredictable price action where technical analysis loses reliability.',
  },
  {
    number: 8,
    name: 'Weekend force-close',
    subtitle: 'Gap risk elimination',
    description:
      'All open positions are closed before the market closes for the weekend (typically Friday 16:55 server time). Weekend gaps -- the difference between Friday close and Sunday open prices -- can be substantial and unpredictable, driven by geopolitical events, natural disasters, or policy announcements that occur while markets are closed. By closing all positions before the weekend, the system eliminates gap risk entirely. No positions are carried over weekends under any circumstances.',
  },
  {
    number: 9,
    name: 'Max hold duration',
    subtitle: '4-hour hard cap',
    description:
      'No position may remain open for longer than 4 hours. This hard cap applies regardless of whether the position is in profit or loss. The rationale is twofold: first, extended holds increase exposure to regime changes and event risk. Second, strategies that require more than 4 hours to reach their target are likely experiencing adverse conditions where the original thesis has weakened. Positions that reach the time limit are closed at market, and the strategy may re-enter on a fresh signal if conditions warrant.',
  },
  {
    number: 10,
    name: 'Cooldown tracker',
    subtitle: 'Loss streak pause mechanism',
    description:
      'After a configurable number of consecutive losses (typically 3), the system enters a cooldown period during which no new trades are opened for the affected strategy. The cooldown duration scales with the streak length: 3 losses triggers a 30-minute pause, 4 losses triggers 60 minutes, 5 losses triggers a session-wide pause for that strategy. This prevents the system from continuing to trade during conditions that are clearly adverse for the active strategy, allowing market conditions to evolve before resuming.',
  },
  {
    number: 11,
    name: 'Spread guard',
    subtitle: 'Reject if spread exceeds threshold',
    description:
      'Before any order is submitted to the broker, the system checks the current bid-ask spread against a per-instrument threshold. If the spread exceeds the threshold (e.g., 3 pips for EURUSD, 5 pips for XAUUSD, 8 pips for XNGUSD), the order is rejected and logged. Wide spreads typically occur during low-liquidity periods (session transitions, pre-news windows, early Asian session) and indicate unfavorable execution conditions. The spread guard ensures the system only trades when execution quality meets minimum standards.',
  },
  {
    number: 12,
    name: 'Session drawdown guard',
    subtitle: 'Per-session equity protection',
    description:
      'In addition to the daily loss limit, a per-session drawdown guard monitors equity during each trading session (Asian, London, New York). If losses within a single session exceed the session threshold (typically 1-1.5% of equity), trading is paused for the remainder of that session. This prevents a single volatile session from consuming the entire daily risk budget, preserving capacity for the remaining sessions where conditions may be more favorable.',
  },
];

export default async function RiskFrameworkPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">

        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-sm text-amber-400 hover:text-amber-400/80 transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Platform overview
            </Link>
            <p className="t-eyebrow mb-4">Risk Management</p>
            <h1 className="t-display-page mb-6">
              12 layers of capital protection.
            </h1>
            <p className="text-foreground/60 leading-relaxed mb-8 max-w-2xl">
              Risk management is not a module bolted onto the trading engine -- it is the
              architecture. Twelve independent layers operate simultaneously, each designed
              to catch a specific class of risk that the others may miss. No single layer
              failure can result in uncontrolled loss. Every layer logs its decisions for
              full auditability.
            </p>
          </div>
        </section>

        {/* Layers — alternating left-right with connecting line */}
        <section className="section-padding">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Protection Layers</p>
            <h2 className="t-display-sub mb-14">All 12 layers</h2>

            <div className="relative">
              {/* Vertical connecting line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/8 hidden md:block" />

              <div className="space-y-0">
                {RISK_LAYERS.map((layer) => {
                  const isEven = layer.number % 2 === 0;
                  const paddedNum = String(layer.number).padStart(2, '0');

                  return (
                    <div key={layer.number} className="relative md:grid md:grid-cols-2 md:gap-16 py-10 first:pt-0 last:pb-0">
                      {/* Center dot on the line */}
                      <div className="absolute left-1/2 top-10 first:top-0 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-amber-500/40 bg-background z-10 hidden md:block" />

                      {/* Odd: number+title left, description right */}
                      {/* Even: description left, number+title right */}
                      {!isEven ? (
                        <>
                          {/* Left — title block */}
                          <div className="md:text-right md:pr-12">
                            <span className="font-display text-6xl text-amber-500/10 leading-none block mb-2">{paddedNum}</span>
                            <h3 className="font-display text-lg text-foreground mb-1">{layer.name}</h3>
                            <p className="t-body-sm text-amber-400">{layer.subtitle}</p>
                          </div>
                          {/* Right — description */}
                          <div className="md:pl-12 mt-4 md:mt-0">
                            <p className="text-foreground/60 leading-relaxed text-sm">{layer.description}</p>
                          </div>
                        </>
                      ) : (
                        <>
                          {/* Left — description */}
                          <div className="md:text-right md:pr-12 order-2 md:order-1 mt-4 md:mt-0">
                            <p className="text-foreground/60 leading-relaxed text-sm">{layer.description}</p>
                          </div>
                          {/* Right — title block */}
                          <div className="md:pl-12 order-1 md:order-2">
                            <span className="font-display text-6xl text-amber-500/10 leading-none block mb-2">{paddedNum}</span>
                            <h3 className="font-display text-lg text-foreground mb-1">{layer.name}</h3>
                            <p className="t-body-sm text-amber-400">{layer.subtitle}</p>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

      </main>
      <EnterpriseFooter />
    </div>
  );
}
