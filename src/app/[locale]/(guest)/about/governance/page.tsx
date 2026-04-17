import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

export const dynamic = 'force-dynamic';

export default async function GovernancePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <Link
              href="/about"
              className="t-body-sm text-foreground/60 hover:text-foreground transition-colors mb-4 inline-block"
            >
              About
            </Link>
            <p className="t-eyebrow mb-4">Corporate Governance</p>
            <h1 className="t-display-page mb-6">
              Governance
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              Legal structure, compliance framework, and disclosures.
            </p>
          </div>
        </section>

        {/* Legal Entity */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Legal Structure</p>
            <h2 className="t-display-sub mb-8">Legal entity</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                BabahAlgo is operated by <strong className="text-foreground">CV Babah Digital</strong>,
                a commercial partnership (Commanditaire Vennootschap) registered under Indonesian commercial law.
                CV Babah Digital provides technology services, trading infrastructure, and advisory services
                to clients across retail, professional, and institutional segments.
              </p>
              <p>
                All client-facing services, contracts, and agreements are executed under the CV Babah Digital
                entity. The company maintains appropriate business licenses and registrations as required by
                Indonesian law.
              </p>
            </div>
          </div>
        </section>

        {/* Regulatory Status */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Compliance</p>
            <h2 className="t-display-sub mb-8">Regulatory status</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                BabahAlgo operates as a <strong className="text-foreground">technology provider</strong>,
                not a futures broker, asset manager, or investment advisor in the regulatory sense.
                We provide trading technology, signal services, and infrastructure management to clients
                who maintain their own accounts at regulated brokers.
              </p>
              <p>
                For PAMM and institutional mandates, trading authority is granted through limited power of
                attorney arrangements directly between the client and the broker. BabahAlgo does not hold,
                custody, or transfer client funds at any point.
              </p>
              <p>
                We monitor regulatory developments in Indonesia (BAPPEBTI/CoFTRA), ASEAN markets, and
                international jurisdictions where our clients operate. Our service structure is designed to
                comply with applicable regulations while providing maximum flexibility to our clients.
              </p>
            </div>
          </div>
        </section>

        {/* Partner Brokers */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Broker Relations</p>
            <h2 className="t-display-sub mb-8">Partner brokers</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                All client trades execute through{' '}
                <a href="#" className="text-foreground underline underline-offset-4 hover:text-amber-400 transition-colors">
                  Exness
                </a>
                , a globally regulated multi-asset broker. Exness is our primary broker partner, selected
                for superior execution quality, regulatory standing across multiple jurisdictions, segregated
                client fund accounts, and reliable API infrastructure.
              </p>
              <p>
                BabahAlgo continuously evaluates broker performance against our criteria for latency,
                slippage, fund safety, and regulatory compliance. Exness meets and exceeds these standards
                across all benchmarks.
              </p>
              <p className="t-body-sm border-l-2 border-white/8 pl-4">
                <strong className="text-foreground">Disclosure:</strong> BabahAlgo receives introducing
                broker (IB) commissions from Exness for client referrals. These
                arrangements are disclosed to clients during onboarding and do not affect the execution
                quality or pricing clients receive. Broker selection is based on objective criteria
                documented in our broker evaluation framework.
              </p>
            </div>
          </div>
        </section>

        {/* Audit */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Oversight</p>
            <h2 className="t-display-sub mb-8">Audit cadence</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                BabahAlgo conducts <strong className="text-foreground">quarterly internal audits</strong> covering:
              </p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Performance data reconciliation between platform records and broker statements</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Risk framework parameter validation and stress testing</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Infrastructure security review and access control audit</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Client fee calculation verification</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Compliance review of marketing materials and client communications</span>
                </li>
              </ul>
              <p>
                Audit summaries are available to institutional clients under NDA. Full audit reports
                can be provided as part of institutional due diligence processes.
              </p>
            </div>
          </div>
        </section>

        {/* Conflict of Interest */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Transparency</p>
            <h2 className="t-display-sub mb-8">Conflict of interest disclosure</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                BabahAlgo is committed to identifying, managing, and disclosing conflicts of interest.
                The following potential conflicts are acknowledged:
              </p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>
                    <strong className="text-foreground">Broker relationships:</strong> We receive IB
                    commissions from partner brokers. Broker selection is based on documented objective
                    criteria and clients are free to use any MT5-compatible broker.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>
                    <strong className="text-foreground">Performance fees:</strong> PAMM and institutional
                    mandates include performance-based compensation, which could incentivize excessive
                    risk-taking. This is mitigated by our risk framework, drawdown limits, and high-water
                    mark provisions.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>
                    <strong className="text-foreground">Proprietary trading:</strong> BabahAlgo principals
                    trade the same strategies as clients. This aligns incentives but means principal
                    and client orders may compete for liquidity at the same price levels.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Privacy */}
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Data Protection</p>
            <h2 className="t-display-sub mb-8">Data privacy framework</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                BabahAlgo takes data privacy seriously. Our framework is designed around the principles
                of data minimization, purpose limitation, and security by default:
              </p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>We collect only the data necessary to provide our services and comply with legal obligations.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Client trading data is encrypted at rest and in transit using industry-standard encryption.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>We do not sell, rent, or share personal data with third parties for marketing purposes.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>Clients can request data export or deletion at any time by contacting our compliance team.</span>
                </li>
              </ul>
              <p>
                For full details, see our{' '}
                <Link href="/legal/privacy" className="text-foreground underline underline-offset-4 hover:text-amber-400">
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>
        </section>

        {/* Compliance Contact */}
        <section className="section-padding">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Contact</p>
            <h2 className="t-display-sub mb-8">Compliance contact</h2>
            <div className="card-enterprise max-w-md">
              <p className="t-body-sm text-foreground/60 mb-4">
                For compliance inquiries, regulatory questions, or to report concerns:
              </p>
              <a
                href="mailto:compliance@babahalgo.com"
                className="font-mono text-sm text-foreground hover:text-amber-400 transition-colors"
              >
                compliance@babahalgo.com
              </a>
              <p className="t-body-sm text-foreground/50 mt-4">
                We aim to respond to all compliance inquiries within 2 business days.
              </p>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
