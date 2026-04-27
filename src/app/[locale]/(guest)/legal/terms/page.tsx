'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/privacy', labelKey: 'page_privacy' as const },
  { href: '/legal/risk-disclosure', labelKey: 'page_risk_disclosure' as const },
  { href: '/legal/regulatory', labelKey: 'page_regulatory' as const },
  { href: '/legal/cookies', labelKey: 'page_cookies' as const },
];

export default function TermsPage() {
  const t = useTranslations('legal_chrome');
  const tb = useTranslations('legal_terms_body');
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
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('eyebrow')}</p>
            <h1 className="t-display-page mb-2">{t('page_terms')}</h1>
            <p className="t-body-sm text-foreground/60">{t('last_updated')}</p>
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

              {/* 1. Acceptance */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s1_h')}</h2>
                <p>{tb('s1_p1')}</p>
                <p className="mt-3">{tb('s1_p2')}</p>
              </section>

              {/* 2. Eligibility */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s2_h')}</h2>
                <p>{tb('s2_p1')}</p>
                <p className="mt-3">{tb('s2_p2')}</p>
              </section>

              {/* 3. Account Registration */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s3_h')}</h2>
                <p>{tb('s3_p1')}</p>
                <p className="mt-3">{tb('s3_p2')}</p>
                <p className="mt-3">{tb('s3_p3')}</p>
              </section>

              {/* 4. Subscription Plans */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s4_h')}</h2>
                <p>{tb('s4_p1')}</p>
                <p className="mt-3">{tb('s4_p2')}</p>
                <p className="mt-3">{tb('s4_p3')}</p>
              </section>

              {/* 5. Billing */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s5_h')}</h2>
                <p>{tb('s5_p1')}</p>
                <p className="mt-3">{tb('s5_p2')}</p>
                <p className="mt-3">{tb('s5_p3')}</p>
                <p className="mt-3">{tb('s5_p4')}</p>
              </section>

              {/* 6. Cancellation */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s6_h')}</h2>
                <p>{tb('s6_p1')}</p>
                <p className="mt-3">{tb('s6_p2')}</p>
                <p className="mt-3">{tb('s6_p3')}</p>
                <p className="mt-3">{tb('s6_p4')}</p>
              </section>

              {/* 7. IP */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s7_h')}</h2>
                <p>{tb('s7_p1')}</p>
                <p className="mt-3">{tb('s7_p2')}</p>
                <p className="mt-3">{tb('s7_p3')}</p>
              </section>

              {/* 8. Limitation of Liability */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s8_h')}</h2>
                <p>{tb('s8_p1')}</p>
                <p className="mt-3">{tb('s8_p2')}</p>
                <p className="mt-3">{tb('s8_p3')}</p>
                <p className="mt-3">{tb('s8_p4')}</p>
              </section>

              {/* 9. Governing Law */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s9_h')}</h2>
                <p>{tb('s9_p1')}</p>
                <p className="mt-3">{tb('s9_p2')}</p>
              </section>

              {/* 10. Contact */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s10_h')}</h2>
                <p>{tb('s10_p1')}</p>
                <div className="mt-4 card-enterprise text-sm">
                  <p className="font-semibold text-foreground">{tb('s10_card_org')}</p>
                  <p className="mt-2">
                    {tb('s10_card_email_label')}{' '}
                    <a href="mailto:legal@babahalgo.com" className="text-foreground underline underline-offset-4">
                      legal@babahalgo.com
                    </a>
                  </p>
                  <p>
                    {tb('s10_card_compliance_label')}{' '}
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
        <section className="section-padding border-t border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('related_eyebrow')}</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {LEGAL_LINKS.map((doc) => (
                <Link
                  key={doc.href}
                  href={doc.href}
                  className="card-enterprise group hover:border-amber-500/30 transition-colors"
                >
                  <p className="text-sm font-medium group-hover:text-amber-400 transition-colors">
                    {t(doc.labelKey)}
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
