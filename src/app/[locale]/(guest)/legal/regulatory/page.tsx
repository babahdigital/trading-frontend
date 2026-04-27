'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/terms', labelKey: 'page_terms' as const },
  { href: '/legal/privacy', labelKey: 'page_privacy' as const },
  { href: '/legal/risk-disclosure', labelKey: 'page_risk_disclosure' as const },
  { href: '/legal/cookies', labelKey: 'page_cookies' as const },
];

export default function RegulatoryPage() {
  const t = useTranslations('legal_chrome');
  const tb = useTranslations('legal_regulatory_body');
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
            <p className="t-eyebrow mb-4">{t('eyebrow')}</p>
            <h1 className="t-display-page mb-2">{t('page_regulatory')}</h1>
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

              {/* BabahAlgo Status */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s1_h')}</h2>
                <p>{tb('s1_p1')}</p>
                <p className="mt-3">{tb('s1_p2')}</p>
                <p className="mt-3">{tb('s1_p3')}</p>
              </section>

              {/* BAPPEBTI */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s2_h')}</h2>
                <p>{tb('s2_p1')}</p>
                <p className="mt-3">{tb('s2_p2')}</p>
                <p className="mt-3">{tb('s2_p3')}</p>
              </section>

              {/* Partner Broker Status */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s3_h')}</h2>
                <p>{tb('s3_intro')}</p>
                <ul className="mt-3 space-y-3 ml-4 text-foreground/60">
                  {(['s3_li1', 's3_li2', 's3_li3', 's3_li4', 's3_li5'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                      <span>{tb(k)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">{tb('s3_outro1')}</p>
                <p className="mt-3">{tb('s3_outro2')}</p>
              </section>

              {/* Compliance Framework */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s4_h')}</h2>
                <p>{tb('s4_intro')}</p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s4_onboard_h')}</h3>
                <p>{tb('s4_onboard_p')}</p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s4_risk_h')}</h3>
                <p>{tb('s4_risk_p')}</p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s4_perf_h')}</h3>
                <p>{tb('s4_perf_p')}</p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s4_conflict_h')}</h3>
                <p>
                  {tb('s4_conflict_p_pre')}{' '}
                  <Link href="/about/governance" className="text-foreground underline underline-offset-4">
                    {tb('s4_conflict_p_link')}
                  </Link>
                  {tb('s4_conflict_p_post')}
                </p>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s4_data_h')}</h3>
                <p>
                  {tb('s4_data_p_pre')}{' '}
                  <Link href="/legal/privacy" className="text-foreground underline underline-offset-4">
                    {tb('s4_data_p_link')}
                  </Link>
                  {tb('s4_data_p_post')}
                </p>
              </section>

              {/* Disclaimer */}
              <section>
                <div className="card-enterprise">
                  <h3 className="font-semibold text-foreground text-sm mb-3">{tb('s5_callout_h')}</h3>
                  <p className="text-xs">{tb('s5_callout_p')}</p>
                </div>
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
