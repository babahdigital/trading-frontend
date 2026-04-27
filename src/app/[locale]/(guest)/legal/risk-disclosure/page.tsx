'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/terms', labelKey: 'page_terms' as const },
  { href: '/legal/privacy', labelKey: 'page_privacy' as const },
  { href: '/legal/regulatory', labelKey: 'page_regulatory' as const },
  { href: '/legal/cookies', labelKey: 'page_cookies' as const },
];

export default function RiskDisclosurePage() {
  const t = useTranslations('legal_chrome');
  const tb = useTranslations('legal_risk_body');
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
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('eyebrow')}</p>
            <h1 className="t-display-page mb-2">{t('page_risk_disclosure')}</h1>
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

              <section>
                <div className="card-enterprise mb-8">
                  <p className="text-sm font-semibold text-foreground">{tb('callout')}</p>
                </div>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s1_h')}</h2>
                <p>{tb('s1_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s2_h')}</h2>
                <p>{tb('s2_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s3_h')}</h2>
                <p>{tb('s3_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s4_h')}</h2>
                <p>{tb('s4_intro')}</p>
                <ul className="mt-3 space-y-3 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">{tb('s4_model_label')}</strong>{' '}
                      {tb('s4_model_text')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">{tb('s4_overfit_label')}</strong>{' '}
                      {tb('s4_overfit_text')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">{tb('s4_tech_label')}</strong>{' '}
                      {tb('s4_tech_text')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">{tb('s4_exec_label')}</strong>{' '}
                      {tb('s4_exec_text')}
                    </span>
                  </li>
                </ul>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s5_h')}</h2>
                <p>{tb('s5_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s6_h')}</h2>
                <p>{tb('s6_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s7_h')}</h2>
                <p>{tb('s7_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s8_h')}</h2>
                <p>{tb('s8_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s9_h')}</h2>
                <p>
                  {tb('s9_p1_pre')} <strong>{tb('s9_p1_strong')}</strong> {tb('s9_p1_post')}
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s10_h')}</h2>
                <p>{tb('s10_p1')}</p>
                <p className="mt-3">{tb('s10_p2')}</p>
              </section>

              <section>
                <p>
                  {tb('contact_pre')}{' '}
                  <a href="mailto:compliance@babahalgo.com" className="text-foreground underline underline-offset-4">
                    compliance@babahalgo.com
                  </a>{tb('contact_post')}
                </p>
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
