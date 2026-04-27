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
  { href: '/legal/regulatory', labelKey: 'page_regulatory' as const },
];

export default function CookiePolicyPage() {
  const t = useTranslations('legal_chrome');
  const tb = useTranslations('legal_cookies_body');
  const [cmsBody, setCmsBody] = useState<string | null>(null);

  useEffect(() => {
    async function loadCms() {
      try {
        const res = await fetch('/api/public/pages?slug=legal-cookies');
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
            <h1 className="t-display-page mb-2">{t('page_cookies')}</h1>
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
                <p>
                  {tb('intro_pre')}{' '}
                  <Link href="/legal/privacy" className="text-foreground underline underline-offset-4">
                    {tb('intro_link')}
                  </Link>
                  {tb('intro_post')}
                </p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s1_h')}</h2>
                <p>{tb('s1_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s2_h')}</h2>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s2_essential_h')}</h3>
                <p>{tb('s2_essential_p')}</p>
                <div className="mt-3 border border-border/60 rounded-lg overflow-hidden text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-card">
                        <th className="text-left p-3 font-medium text-foreground/60">{tb('s2_table_col_cookie')}</th>
                        <th className="text-left p-3 font-medium text-foreground/60">{tb('s2_table_col_purpose')}</th>
                        <th className="text-left p-3 font-medium text-foreground/60">{tb('s2_table_col_duration')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="p-3 font-mono text-xs">session_token</td>
                        <td className="p-3">{tb('s2_essential_session_purpose')}</td>
                        <td className="p-3">{tb('s2_essential_session_duration')}</td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="p-3 font-mono text-xs">csrf_token</td>
                        <td className="p-3">{tb('s2_essential_csrf_purpose')}</td>
                        <td className="p-3">{tb('s2_essential_csrf_duration')}</td>
                      </tr>
                      <tr className="border-b border-border/60">
                        <td className="p-3 font-mono text-xs">locale</td>
                        <td className="p-3">{tb('s2_essential_locale_purpose')}</td>
                        <td className="p-3">{tb('s2_essential_locale_duration')}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">cookie_consent</td>
                        <td className="p-3">{tb('s2_essential_consent_purpose')}</td>
                        <td className="p-3">{tb('s2_essential_consent_duration')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s2_analytics_h')}</h3>
                <p>{tb('s2_analytics_p')}</p>
                <div className="mt-3 border border-border/60 rounded-lg overflow-hidden text-sm">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border/60 bg-card">
                        <th className="text-left p-3 font-medium text-foreground/60">{tb('s2_table_col_cookie')}</th>
                        <th className="text-left p-3 font-medium text-foreground/60">{tb('s2_table_col_purpose')}</th>
                        <th className="text-left p-3 font-medium text-foreground/60">{tb('s2_table_col_duration')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/60">
                        <td className="p-3 font-mono text-xs">_analytics_id</td>
                        <td className="p-3">{tb('s2_analytics_id_purpose')}</td>
                        <td className="p-3">{tb('s2_analytics_id_duration')}</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-mono text-xs">_analytics_session</td>
                        <td className="p-3">{tb('s2_analytics_session_purpose')}</td>
                        <td className="p-3">{tb('s2_analytics_session_duration')}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <h3 className="font-semibold text-foreground mt-6 mb-3">{tb('s2_functional_h')}</h3>
                <p>{tb('s2_functional_p')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s3_h')}</h2>
                <p>{tb('s3_intro')}</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">{tb('s3_cf_label')}</strong> {tb('s3_cf_text')}
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>
                      <strong className="text-foreground">{tb('s3_payment_label')}</strong> {tb('s3_payment_text')}
                    </span>
                  </li>
                </ul>
                <p className="mt-3">{tb('s3_outro')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s4_h')}</h2>
                <p>{tb('s4_p1')}</p>
                <p className="mt-3">{tb('s4_intro')}</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  {(['s4_chrome', 's4_firefox', 's4_safari', 's4_edge'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                      <span>{tb(k)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s5_h')}</h2>
                <p>{tb('s5_p1')}</p>
              </section>

              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s6_h')}</h2>
                <p>
                  {tb('s6_p1_pre')}{' '}
                  <a href="mailto:privacy@babahalgo.com" className="text-foreground underline underline-offset-4">
                    privacy@babahalgo.com
                  </a>{tb('s6_p1_post')}
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
