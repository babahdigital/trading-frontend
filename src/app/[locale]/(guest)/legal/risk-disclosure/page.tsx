'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/regulatory', label: 'Regulatory Information' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
];

export default function RiskDisclosurePage() {
  const [cmsBody, setCmsBody] = useState<string | null>(null);

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/public/pages?slug=legal-risk-disclosure');
        if (!res.ok) return;
        const data = await res.json();
        if (data && data.body) {
          setCmsBody(data.body);
        }
      } catch {
        // keep fallback
      }
    }
    loadCms();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Legal</p>
            <h1 className="t-display-page mb-2">Risk Disclosure</h1>
            <p className="t-body-sm text-foreground/60">Last updated: April 1, 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding">
          <div className="container-default px-6">
            {cmsBody ? (
              <div
                className="container-prose space-y-10 text-foreground/60"
                style={{ lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: cmsBody }}
              />
            ) : (
            <div className="container-prose space-y-10 text-foreground/60" style={{ lineHeight: 1.7 }}>

              <section>
                <div className="card-enterprise mb-8">
                  <p className="text-sm font-semibold text-foreground">
                    IMPORTANT: Please read this Risk Disclosure Statement carefully before using any
                    BabahAlgo services. Trading in foreign exchange (forex), commodities, and financial
                    derivatives involves substantial risk of loss and is not suitable for all investors.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">1. General Risk Warning</h2>
                <p>
                  Trading in foreign exchange, contracts for difference (CFDs), commodities, and other
                  financial instruments carries a high level of risk. The high degree of leverage available
                  in these markets can work against you as well as for you. Before deciding to trade, you
                  should carefully consider your investment objectives, level of experience, and risk
                  appetite. The possibility exists that you could sustain a loss of some or all of your
                  initial investment, and therefore you should not invest money that you cannot afford to lose.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">2. Leverage Risk</h2>
                <p>
                  Leveraged trading means that both profits and losses are magnified. A relatively small
                  market movement can have a proportionally larger impact on the funds you have deposited.
                  This can work against you as well as for you. You may sustain a total loss of initial
                  margin funds and any additional funds deposited with the broker to maintain your position.
                  If the market moves against your position or margin levels are increased, you may be called
                  upon to deposit additional funds on short notice to maintain your position. Failure to
                  comply with a request for additional funds may result in your position being liquidated
                  at a loss, and you will be liable for any resulting deficit.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">3. Market Risk</h2>
                <p>
                  Financial markets are subject to rapid and unpredictable price movements caused by
                  economic events, geopolitical developments, central bank decisions, natural disasters,
                  and other factors beyond anyone&apos;s control. Market gaps, sudden spikes in volatility,
                  and liquidity disruptions can cause significant losses even when risk management measures
                  are in place. Weekend gaps, holiday market closures, and unexpected news events can
                  result in positions being closed at prices significantly different from the intended
                  stop-loss levels.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">4. Algorithmic and Systematic Trading Risk</h2>
                <p>
                  BabahAlgo employs algorithmic trading strategies that are developed based on historical
                  data and statistical models. These strategies are subject to the following specific risks:
                </p>
                <ul className="mt-3 space-y-3 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">Model risk:</strong> Trading models are based on
                      historical patterns that may not repeat in the future. Market regime changes can
                      cause models to underperform or generate losses.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">Overfitting risk:</strong> Despite rigorous
                      validation procedures, there is a risk that strategies may be inadvertently fitted
                      to historical noise rather than genuine market patterns.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">Technology risk:</strong> Algorithmic trading
                      depends on technology infrastructure including servers, network connections, and
                      software. Hardware failures, software bugs, connectivity issues, and power outages
                      can disrupt trading and cause losses.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">Execution risk:</strong> The difference between
                      expected and actual execution prices (slippage) can reduce returns. During periods
                      of high volatility or low liquidity, slippage may be significant.
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">5. Past Performance</h2>
                <p>
                  Past performance is not indicative of future results. Historical returns, backtested
                  results, and simulated performance do not guarantee future profitability. Performance
                  data shown on our platform represents the results of a specific account or strategy
                  configuration and may not be representative of all client experiences. Actual client
                  returns may differ based on account size, timing of entry, fee structure, broker
                  execution quality, and other factors.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">6. Counterparty and Broker Risk</h2>
                <p>
                  Client funds held at brokers are subject to the financial stability and regulatory
                  compliance of those brokers. While we work exclusively with regulated brokers that
                  maintain segregated client accounts, there remains a risk of broker insolvency,
                  regulatory action, or operational failure that could affect the availability or
                  safety of your funds. BabahAlgo does not guarantee the solvency or performance of
                  any broker partner.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">7. Liquidity Risk</h2>
                <p>
                  Under certain market conditions, it may be difficult or impossible to liquidate a
                  position at the desired price. This can occur during major news events, market opens
                  following weekends or holidays, or during periods of extreme market stress. In such
                  conditions, stop-loss orders may be executed at prices significantly worse than the
                  specified level, resulting in larger-than-expected losses.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">8. Regulatory and Legal Risk</h2>
                <p>
                  Changes in laws, regulations, or regulatory interpretation in any jurisdiction where
                  BabahAlgo operates or where clients reside may affect the availability, legality, or
                  terms of our services. Tax treatment of trading profits and losses varies by jurisdiction
                  and may change. You are responsible for understanding and complying with the tax and
                  regulatory requirements applicable to your situation.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">9. PAMM and Managed Account Risk</h2>
                <p>
                  If you invest in a PAMM or managed account, you are entrusting trading decisions to
                  BabahAlgo. While we employ risk management frameworks to limit losses, there is no
                  guarantee that these measures will prevent significant drawdowns or losses. You
                  should only allocate capital to managed trading that you can afford to lose entirely.
                  The profit-sharing fee structure means that BabahAlgo earns fees on profitable periods
                  even if your overall investment is at a loss when accounting for prior drawdowns,
                  although our high-water mark provisions mitigate this risk.
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">10. Acknowledgment</h2>
                <p>
                  By using BabahAlgo services, you acknowledge that you have read and understood this
                  Risk Disclosure Statement. You confirm that you understand the risks involved in
                  trading financial instruments and that you are willing to accept these risks. You
                  acknowledge that BabahAlgo has not made any guarantees regarding the performance of
                  its trading strategies or the safety of your investment.
                </p>
                <p className="mt-3">
                  If you do not understand any aspect of this Risk Disclosure Statement, you should
                  seek independent financial advice before using our services.
                </p>
              </section>

              <section>
                <p>
                  For questions about risk disclosure, contact us at{' '}
                  <a href="mailto:compliance@babahalgo.com" className="text-foreground underline underline-offset-4">
                    compliance@babahalgo.com
                  </a>.
                </p>
              </section>

            </div>
            )}
          </div>
        </section>

        {/* Related Documents */}
        <section className="section-padding border-t border-border/60">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Related Documents</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {LEGAL_LINKS.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="card-enterprise group hover:border-amber-500/30 transition-colors"
                >
                  <p className="text-sm font-medium group-hover:text-amber-400 transition-colors">
                    {doc.label}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
