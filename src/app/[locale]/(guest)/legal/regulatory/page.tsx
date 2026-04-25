'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/risk-disclosure', label: 'Risk Disclosure' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
];

export default function RegulatoryPage() {
  const [cmsBody, setCmsBody] = useState<string | null>(null);

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/public/pages?slug=legal-regulatory');
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
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">Legal</p>
            <h1 className="t-display-page mb-2">Regulatory Information</h1>
            <p className="t-body-sm text-foreground/60">Last updated: April 1, 2026</p>
          </div>
        </section>

        {/* Content */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            {cmsBody ? (
              <div
                className="container-prose space-y-10 text-foreground/60"
                style={{ lineHeight: 1.7 }}
                dangerouslySetInnerHTML={{ __html: cmsBody }}
              />
            ) : (
            <div className="container-prose space-y-10 text-foreground/60" style={{ lineHeight: 1.7 }}>

              {/* BabahAlgo Status */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">BabahAlgo Regulatory Status</h2>
                <p>
                  BabahAlgo is operated by CV Babah Digital, a commercial partnership registered under
                  Indonesian law. BabahAlgo operates as a technology provider and trading infrastructure
                  service, not as a regulated financial institution, broker, or investment advisor.
                </p>
                <p className="mt-3">
                  Our services include the provision of trading signals, algorithmic trading infrastructure,
                  and technology-enabled managed account services. We do not hold client funds, execute
                  trades on regulated exchanges directly, or provide personalized investment advice in the
                  regulatory sense.
                </p>
                <p className="mt-3">
                  Trading authority for managed accounts (PAMM and institutional mandates) is established
                  through limited power of attorney arrangements between clients and regulated brokers.
                  BabahAlgo acts as the appointed trading manager under these arrangements.
                </p>
              </section>

              {/* BAPPEBTI */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">BAPPEBTI / CoFTRA Information</h2>
                <p>
                  The Commodity Futures Trading Regulatory Agency (BAPPEBTI), also known as the Commodity
                  Futures Trading Authority (CoFTRA), is the Indonesian government agency responsible for
                  regulating commodity futures and derivatives trading in Indonesia.
                </p>
                <p className="mt-3">
                  BabahAlgo is not a registered futures broker, commodity trading advisor, or futures
                  commission merchant with BAPPEBTI. Our role is limited to providing technology services
                  and trading infrastructure. Clients who are Indonesian residents should ensure they
                  trade through BAPPEBTI-regulated brokers and comply with all applicable Indonesian
                  regulations regarding futures and derivatives trading.
                </p>
                <p className="mt-3">
                  We monitor BAPPEBTI regulations and guidance on digital asset trading, commodity futures,
                  and financial technology services to ensure our service structure remains compliant with
                  the evolving regulatory framework in Indonesia.
                </p>
              </section>

              {/* Partner Broker Status */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">Partner Broker Regulatory Status</h2>
                <p>
                  BabahAlgo works with broker partners that are regulated by recognized financial
                  authorities in their respective jurisdictions. Our broker selection criteria include:
                </p>
                <ul className="mt-3 space-y-3 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Active regulation by a recognized financial authority</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Segregation of client funds from company operational funds</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Participation in investor compensation schemes where available</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Regular financial reporting and audit requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Reliable API infrastructure for algorithmic trading</span>
                  </li>
                </ul>
                <p className="mt-3">
                  Specific broker partner details, including their regulatory licenses and jurisdictions,
                  are provided to clients during the onboarding process. Clients are encouraged to verify
                  the regulatory status of their broker independently.
                </p>
                <p className="mt-3">
                  BabahAlgo does not guarantee the financial stability, regulatory compliance, or
                  operational integrity of any broker partner. Clients should conduct their own due
                  diligence before opening an account with any broker.
                </p>
              </section>

              {/* Compliance Framework */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">Compliance Framework</h2>
                <p>
                  BabahAlgo maintains an internal compliance framework designed to ensure responsible
                  operations and transparent client relationships. This framework includes:
                </p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">Client onboarding</h3>
                <p>
                  All clients undergo an onboarding process that includes identity verification,
                  suitability assessment, and risk disclosure acknowledgment. For institutional mandates,
                  additional due diligence is conducted including entity verification, beneficial
                  ownership identification, and source of funds documentation.
                </p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">Risk management</h3>
                <p>
                  Our 12-layer risk framework is documented and audited quarterly. Risk parameters
                  including maximum drawdown limits, position size caps, and correlation limits are
                  enforced programmatically and cannot be overridden manually without documented
                  approval and audit trail.
                </p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">Performance reporting</h3>
                <p>
                  All performance data is reconciled quarterly against broker statements. We maintain
                  independent verification through MyFxBook and provide detailed trade-level reporting
                  to all clients. Performance marketing materials are reviewed for accuracy and
                  compliance with applicable advertising standards.
                </p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">Conflict of interest management</h3>
                <p>
                  We maintain a conflict of interest register that identifies, manages, and discloses
                  potential conflicts. This includes broker referral arrangements, proprietary trading
                  activities, and performance fee structures. The register is reviewed quarterly and
                  disclosed to clients as detailed on our{' '}
                  <Link href="/about/governance" className="text-foreground underline underline-offset-4">
                    Governance page
                  </Link>.
                </p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">Data protection</h3>
                <p>
                  Client data is handled in accordance with our{' '}
                  <Link href="/legal/privacy" className="text-foreground underline underline-offset-4">
                    Privacy Policy
                  </Link>. We implement encryption, access controls, and audit logging to protect
                  client information. Data breach notification procedures are in place to ensure
                  timely communication in the event of a security incident.
                </p>
              </section>

              {/* Disclaimer */}
              <section>
                <div className="card-enterprise">
                  <h3 className="font-semibold text-foreground text-sm mb-3">Important Notice</h3>
                  <p className="text-xs">
                    This page is provided for informational purposes only and does not constitute legal
                    or regulatory advice. Regulatory requirements vary by jurisdiction, and it is your
                    responsibility to ensure that your use of BabahAlgo services complies with all
                    applicable laws and regulations in your jurisdiction. If you are unsure about the
                    regulatory implications of using our services, you should consult with a qualified
                    legal or financial advisor in your jurisdiction.
                  </p>
                </div>
              </section>

              <section>
                <p>
                  For regulatory inquiries, contact{' '}
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
          <div className="container-default px-4 sm:px-6">
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
