'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/privacy', label: 'Privacy Policy' },
  { href: '/legal/risk-disclosure', label: 'Risk Disclosure' },
  { href: '/legal/regulatory', label: 'Regulatory Information' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
];

export default function TermsPage() {
  const [cmsBody, setCmsBody] = useState<string | null>(null);

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/public/pages?slug=legal-terms');
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
        <section className="section-padding border-b border-white/8">
          <div className="container-default px-6">
            <p className="t-eyebrow mb-4">Legal</p>
            <h1 className="t-display-page mb-2">Terms of Service</h1>
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

              {/* 1. Acceptance */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">1. Acceptance of Terms</h2>
                <p>
                  By accessing or using the BabahAlgo platform, website, applications, APIs, or any services
                  provided by CV Babah Digital (&quot;BabahAlgo,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;),
                  you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these
                  Terms, you must not access or use our services.
                </p>
                <p className="mt-3">
                  These Terms constitute a legally binding agreement between you and CV Babah Digital.
                  We reserve the right to modify these Terms at any time. Material changes will be
                  communicated via email or through a notice on our platform. Your continued use of our
                  services after such modifications constitutes acceptance of the updated Terms.
                </p>
              </section>

              {/* 2. Eligibility */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">2. Eligibility</h2>
                <p>
                  To use BabahAlgo services, you must be at least 18 years of age (or the age of legal
                  majority in your jurisdiction, whichever is higher) and have the legal capacity to enter
                  into binding contracts. By using our services, you represent and warrant that you meet
                  these eligibility requirements.
                </p>
                <p className="mt-3">
                  Our services are not available to residents of jurisdictions where trading in foreign
                  exchange, commodities, or financial derivatives is prohibited by law. It is your
                  responsibility to ensure that your use of our services complies with all applicable
                  laws and regulations in your jurisdiction.
                </p>
              </section>

              {/* 3. Account Registration */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">3. Account Registration</h2>
                <p>
                  To access certain services, you must create an account by providing accurate, complete,
                  and current information. You are responsible for maintaining the confidentiality of your
                  account credentials and for all activities that occur under your account.
                </p>
                <p className="mt-3">
                  You agree to notify us immediately of any unauthorized use of your account or any other
                  breach of security. BabahAlgo will not be liable for any loss arising from unauthorized
                  use of your account where you have failed to maintain the security of your credentials.
                </p>
                <p className="mt-3">
                  We reserve the right to suspend or terminate accounts that contain false or misleading
                  information, or that are used in violation of these Terms.
                </p>
              </section>

              {/* 4. Subscription Plans */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">4. Subscription Plans and Services</h2>
                <p>
                  BabahAlgo offers several service tiers including Signal Service, PAMM Account management,
                  VPS License, and Institutional mandates. Each service tier has specific terms, pricing,
                  and conditions that are presented during the subscription or onboarding process.
                </p>
                <p className="mt-3">
                  Service descriptions, features, and pricing are subject to change. We will provide
                  reasonable notice of material changes to existing subscribers. New pricing applies to
                  new subscriptions and renewals after the effective date of the change.
                </p>
                <p className="mt-3">
                  BabahAlgo provides trading signals, technology infrastructure, and managed account
                  services. We do not guarantee any specific trading results, returns, or performance
                  outcomes. Past performance is not indicative of future results.
                </p>
              </section>

              {/* 5. Billing */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">5. Billing and Payment</h2>
                <p>
                  Subscription fees are billed in advance on a monthly basis unless otherwise specified.
                  Performance fees for PAMM and institutional mandates are calculated and billed according
                  to the terms of the applicable service agreement.
                </p>
                <p className="mt-3">
                  All fees are quoted in US Dollars (USD) unless otherwise stated. You are responsible
                  for any applicable taxes, currency conversion fees, or bank charges associated with
                  your payments.
                </p>
                <p className="mt-3">
                  We accept payment via bank transfer, credit card, and select cryptocurrency methods.
                  Payment processing is handled by third-party payment processors, and your use of
                  these services is subject to their respective terms and privacy policies.
                </p>
                <p className="mt-3">
                  Late payments may result in suspension of services. Accounts with payments overdue
                  by more than 14 days may be suspended until the outstanding balance is settled.
                </p>
              </section>

              {/* 6. Cancellation */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">6. Cancellation and Refunds</h2>
                <p>
                  Signal Service subscriptions can be cancelled at any time. Cancellation takes effect at
                  the end of the current billing period. No partial refunds are provided for unused
                  portions of a billing period.
                </p>
                <p className="mt-3">
                  PAMM Account mandates can be terminated with written notice. Withdrawal of funds from
                  PAMM accounts is subject to the terms of the broker agreement and may take up to 3
                  business days to process. Outstanding performance fees are calculated and deducted at
                  the time of termination.
                </p>
                <p className="mt-3">
                  VPS License setup fees are non-refundable once the discovery phase has commenced.
                  Monthly maintenance fees can be cancelled with 30 days written notice.
                </p>
                <p className="mt-3">
                  Institutional mandates are governed by the specific terms of the Investment Management
                  Agreement (IMA) executed between the parties.
                </p>
              </section>

              {/* 7. IP */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">7. Intellectual Property</h2>
                <p>
                  All content, software, algorithms, strategies, documentation, and materials available
                  through BabahAlgo services are the intellectual property of CV Babah Digital or its
                  licensors. This includes, without limitation, trading algorithms, risk frameworks,
                  signal generation systems, and platform software.
                </p>
                <p className="mt-3">
                  Your subscription grants you a limited, non-exclusive, non-transferable, revocable
                  license to use our services for your personal or internal business purposes only. You
                  may not copy, modify, distribute, sell, or lease any part of our services or included
                  software, nor may you reverse engineer or attempt to extract the source code of our
                  algorithms or systems.
                </p>
                <p className="mt-3">
                  Trading signals, research notes, and performance data provided through our services
                  are for your personal use only and may not be redistributed, resold, or shared with
                  third parties without prior written consent.
                </p>
              </section>

              {/* 8. Limitation of Liability */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">8. Limitation of Liability</h2>
                <p>
                  To the maximum extent permitted by applicable law, BabahAlgo and its officers, directors,
                  employees, and agents shall not be liable for any indirect, incidental, special,
                  consequential, or punitive damages, including but not limited to loss of profits,
                  trading losses, data loss, or other intangible losses.
                </p>
                <p className="mt-3">
                  BabahAlgo does not guarantee the accuracy, timeliness, or completeness of any trading
                  signals, market data, or performance information. Trading decisions based on our
                  signals or services are made at your own risk. You acknowledge that trading in
                  financial markets involves substantial risk of loss and is not suitable for all investors.
                </p>
                <p className="mt-3">
                  Our total liability for any claims arising from or related to these Terms or our
                  services shall not exceed the total fees paid by you to BabahAlgo in the 12 months
                  preceding the claim.
                </p>
                <p className="mt-3">
                  BabahAlgo is not liable for losses caused by broker failures, connectivity issues,
                  market gaps, liquidity events, or other circumstances beyond our reasonable control.
                </p>
              </section>

              {/* 9. Governing Law */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">9. Governing Law and Dispute Resolution</h2>
                <p>
                  These Terms are governed by and construed in accordance with the laws of the Republic
                  of Indonesia. Any disputes arising from or relating to these Terms or our services
                  shall be resolved through good-faith negotiation between the parties.
                </p>
                <p className="mt-3">
                  If a dispute cannot be resolved through negotiation within 30 days, it shall be
                  submitted to binding arbitration in accordance with the rules of the Indonesian
                  National Board of Arbitration (BANI). The seat of arbitration shall be Jakarta,
                  Indonesia, and the language of arbitration shall be English or Bahasa Indonesia
                  as agreed by the parties.
                </p>
              </section>

              {/* 10. Contact */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">10. Contact Information</h2>
                <p>
                  For questions or concerns regarding these Terms of Service, please contact us at:
                </p>
                <div className="mt-4 card-enterprise text-sm">
                  <p className="font-semibold text-foreground">CV Babah Digital</p>
                  <p className="mt-2">
                    Email:{' '}
                    <a href="mailto:legal@babahalgo.com" className="text-foreground underline underline-offset-4">
                      legal@babahalgo.com
                    </a>
                  </p>
                  <p>
                    Compliance:{' '}
                    <a href="mailto:compliance@babahalgo.com" className="text-foreground underline underline-offset-4">
                      compliance@babahalgo.com
                    </a>
                  </p>
                </div>
              </section>

            </div>
            )}
          </div>
        </section>

        {/* Related Documents */}
        <section className="section-padding border-t border-white/8">
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
