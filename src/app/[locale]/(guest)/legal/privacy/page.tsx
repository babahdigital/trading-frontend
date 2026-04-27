'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';

const LEGAL_LINKS = [
  { href: '/legal/terms', labelKey: 'page_terms' as const },
  { href: '/legal/risk-disclosure', labelKey: 'page_risk_disclosure' as const },
  { href: '/legal/regulatory', labelKey: 'page_regulatory' as const },
  { href: '/legal/cookies', labelKey: 'page_cookies' as const },
];

export default function PrivacyPage() {
  const t = useTranslations('legal_chrome');
  const tb = useTranslations('legal_privacy_body');
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
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('eyebrow')}</p>
            <h1 className="t-display-page mb-2">{t('page_privacy')}</h1>
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
                <p>{tb('intro')}</p>
              </section>

              {/* Data Collection */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s1_h')}</h2>
                <p>{tb('s1_p1')}</p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s1_account_label')}</strong>{' '}
                  {tb('s1_account_text')}
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s1_trading_label')}</strong>{' '}
                  {tb('s1_trading_text')}
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s1_technical_label')}</strong>{' '}
                  {tb('s1_technical_text')}
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s1_communication_label')}</strong>{' '}
                  {tb('s1_communication_text')}
                </p>
              </section>

              {/* Usage */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s2_h')}</h2>
                <p>{tb('s2_intro')}</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  {(['s2_li1', 's2_li2', 's2_li3', 's2_li4', 's2_li5', 's2_li6', 's2_li7'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                      <span>{tb(k)}</span>
                    </li>
                  ))}
                </ul>
              </section>

              {/* Storage */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s3_h')}</h2>
                <p>{tb('s3_p1')}</p>
                <p className="mt-3">{tb('s3_p2')}</p>
              </section>

              {/* Third Parties */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s4_h')}</h2>
                <p>{tb('s4_p1')}</p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s4_broker_label')}</strong>{' '}
                  {tb('s4_broker_text')}
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s4_payment_label')}</strong>{' '}
                  {tb('s4_payment_text')}
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s4_legal_label')}</strong>{' '}
                  {tb('s4_legal_text')}
                </p>
                <p className="mt-3">
                  <strong className="text-foreground">{tb('s4_service_label')}</strong>{' '}
                  {tb('s4_service_text')}
                </p>
              </section>

              {/* Cookies */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s5_h')}</h2>
                <p>
                  {tb('s5_p1_pre')}{' '}
                  <Link href="/legal/cookies" className="text-foreground underline underline-offset-4">
                    {tb('s5_p1_link')}
                  </Link>
                  {tb('s5_p1_post')}
                </p>
                <p className="mt-3">{tb('s5_p2')}</p>
              </section>

              {/* User Rights */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s6_h')}</h2>
                <p>{tb('s6_intro')}</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">{tb('s6_access_label')}</strong> {tb('s6_access_text')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">{tb('s6_correction_label')}</strong> {tb('s6_correction_text')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">{tb('s6_deletion_label')}</strong> {tb('s6_deletion_text')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">{tb('s6_portability_label')}</strong> {tb('s6_portability_text')}</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span><strong className="text-foreground">{tb('s6_objection_label')}</strong> {tb('s6_objection_text')}</span>
                  </li>
                </ul>
                <p className="mt-3">
                  {tb('s6_outro_pre')}{' '}
                  <a href="mailto:privacy@babahalgo.com" className="text-foreground underline underline-offset-4">
                    privacy@babahalgo.com
                  </a>{tb('s6_outro_post')}
                </p>
              </section>

              {/* Data Security */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s7_h')}</h2>
                <p>{tb('s7_p1')}</p>
                <ul className="mt-3 space-y-2 ml-4 text-foreground/60">
                  {(['s7_li1', 's7_li2', 's7_li3', 's7_li4', 's7_li5'] as const).map((k) => (
                    <li key={k} className="flex items-start gap-3">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                      <span>{tb(k)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3">{tb('s7_outro')}</p>
              </section>

              {/* Changes */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s8_h')}</h2>
                <p>{tb('s8_p1')}</p>
                <p className="mt-3">{tb('s8_p2')}</p>
              </section>

              {/* Contact */}
              <section>
                <h2 className="t-display-sub mb-6 text-foreground">{tb('s9_h')}</h2>
                <p>{tb('s9_p1')}</p>
                <div className="mt-4 card-enterprise text-sm">
                  <p className="font-semibold text-foreground">{tb('s9_card_org')}</p>
                  <p className="mt-2">
                    {tb('s9_card_email_label')}{' '}
                    <a href="mailto:privacy@babahalgo.com" className="text-foreground underline underline-offset-4">
                      privacy@babahalgo.com
                    </a>
                  </p>
                  <p>
                    {tb('s9_card_compliance_label')}{' '}
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
