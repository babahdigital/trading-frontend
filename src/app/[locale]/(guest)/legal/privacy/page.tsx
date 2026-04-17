'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/terms', label: 'Terms of Service' },
  { href: '/legal/risk-disclosure', label: 'Risk Disclosure' },
  { href: '/legal/regulatory', label: 'Regulatory Information' },
  { href: '/legal/cookies', label: 'Cookie Policy' },
];

export default function PrivacyPage() {
  const [cmsBody, setCmsBody] = useState<string | null>(null);

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/public/pages?slug=legal-privacy');
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
            <h1 className="t-display-page mb-2">Privacy Policy</h1>
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
                <p>
                  CV Babah Digital (&quot;BabahAlgo,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
                  is committed to protecting your privacy. This Privacy Policy explains how we collect, use,
                  store, and protect your personal information when you use our website, platform, and services.
                </p>
              </section>

              {/* Data Collection */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">1. Data Collection</h2>
                <p>We collect the following categories of personal information:</p>
                <p className="mt-3">
                  <strong className="text-foreground">Account information:</strong> When you register for an
                  account, we collect your name, email address, phone number, and country of residence.
                  For PAMM and institutional clients, we may also collect identification documents,
                  proof of address, and financial information as required by our onboarding process.
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Trading data:</strong> We collect and store records of
                  trading signals delivered to you, trade execution data for managed accounts, portfolio
                  performance metrics, and risk analytics. This data is necessary to provide our services
                  and generate performance reports.
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Technical data:</strong> We automatically collect
                  information about your device, browser type, operating system, IP address, access times,
                  and pages viewed when you use our platform. This data helps us maintain security,
                  diagnose technical issues, and improve our services.
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Communication data:</strong> We retain records of your
                  communications with us, including support requests, feedback, and correspondence via
                  email, WhatsApp, or our contact form.
                </p>
              </section>

              {/* Usage */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">2. How We Use Your Data</h2>
                <p>We use your personal information for the following purposes:</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To provide, maintain, and improve our trading services and platform</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To process transactions, manage subscriptions, and handle billing</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To deliver trading signals, performance reports, and account notifications</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To respond to your inquiries and provide customer support</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To comply with legal obligations and regulatory requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To detect and prevent fraud, abuse, and security threats</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>To send service-related communications (not marketing) about your account</span>
                  </li>
                </ul>
              </section>

              {/* Storage */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">3. Data Storage and Retention</h2>
                <p>
                  Your personal data is stored on secure servers protected by industry-standard security
                  measures including encryption at rest (AES-256) and in transit (TLS 1.3). Our
                  infrastructure is hosted on dedicated servers with access controls, monitoring, and
                  automated backup systems.
                </p>
                <p className="mt-3">
                  We retain your personal data for as long as your account is active or as needed to
                  provide our services. After account closure, we retain certain data for a minimum of
                  5 years to comply with legal and regulatory requirements, resolve disputes, and
                  enforce our agreements. Trading records and performance data may be retained
                  indefinitely in anonymized form for research and benchmarking purposes.
                </p>
              </section>

              {/* Third Parties */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">4. Third-Party Sharing</h2>
                <p>
                  We do not sell, rent, or trade your personal information to third parties for their
                  marketing purposes. We may share your information in the following circumstances:
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Broker partners:</strong> To facilitate account
                  opening and trade execution for PAMM and VPS License clients, we share necessary
                  account information with our partner brokers. These brokers are regulated entities
                  with their own privacy and data protection obligations.
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Payment processors:</strong> We share billing
                  information with our payment processing partners to process subscription payments
                  and performance fees.
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Legal compliance:</strong> We may disclose your
                  information when required by law, regulation, legal process, or governmental request,
                  or when we believe disclosure is necessary to protect our rights, your safety, or the
                  safety of others.
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">Service providers:</strong> We use third-party
                  services for email delivery, analytics, and infrastructure hosting. These providers
                  are contractually obligated to protect your data and use it only for the purposes
                  we specify.
                </p>
              </section>

              {/* Cookies */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">5. Cookies and Tracking</h2>
                <p>
                  We use cookies and similar technologies to maintain session state, remember your
                  preferences, and understand how you use our platform. For full details on our cookie
                  practices, see our{' '}
                  <Link href="/legal/cookies" className="text-foreground underline underline-offset-4">
                    Cookie Policy
                  </Link>.
                </p>
                <p className="mt-3">
                  We use essential cookies that are necessary for the platform to function (such as
                  authentication tokens) and optional analytics cookies that help us understand usage
                  patterns. You can control cookie preferences through your browser settings.
                </p>
              </section>

              {/* User Rights */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">6. Your Rights</h2>
                <p>You have the following rights regarding your personal data:</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">Access:</strong> Request a copy of the personal data we hold about you</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">Correction:</strong> Request correction of inaccurate or incomplete data</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">Deletion:</strong> Request deletion of your data, subject to legal retention requirements</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">Portability:</strong> Request your data in a structured, machine-readable format</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">Objection:</strong> Object to processing of your data for specific purposes</span>
                  </li>
                </ul>
                <p className="mt-3">
                  To exercise any of these rights, contact us at{' '}
                  <a href="mailto:privacy@babahalgo.com" className="text-foreground underline underline-offset-4">
                    privacy@babahalgo.com
                  </a>. We will respond to your request within 30 days.
                </p>
              </section>

              {/* Data Security */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">7. Data Security</h2>
                <p>
                  We implement appropriate technical and organizational measures to protect your personal
                  data against unauthorized access, alteration, disclosure, or destruction. These measures
                  include:
                </p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Encryption of data at rest and in transit</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Role-based access control with principle of least privilege</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Regular security audits and vulnerability assessments</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Automated monitoring and alerting for security events</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>Secure backup and disaster recovery procedures</span>
                  </li>
                </ul>
                <p className="mt-3">
                  While we take all reasonable precautions, no method of electronic transmission or
                  storage is 100% secure. We cannot guarantee absolute security of your data.
                </p>
              </section>

              {/* Changes */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">8. Changes to This Policy</h2>
                <p>
                  We may update this Privacy Policy from time to time to reflect changes in our practices,
                  technology, legal requirements, or other factors. We will notify you of material changes
                  by email or through a prominent notice on our platform at least 14 days before the
                  changes take effect.
                </p>
                <p className="mt-3">
                  We encourage you to review this Privacy Policy periodically. The &quot;Last updated&quot;
                  date at the top of this page indicates when the policy was last revised.
                </p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">9. Contact</h2>
                <p>
                  For questions or concerns regarding this Privacy Policy or our data practices, contact us at:
                </p>
                <div className="mt-4 card-enterprise text-sm">
                  <p className="font-semibold text-foreground">CV Babah Digital - Data Protection</p>
                  <p className="mt-2">
                    Email:{' '}
                    <a href="mailto:privacy@babahalgo.com" className="text-foreground underline underline-offset-4">
                      privacy@babahalgo.com
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
