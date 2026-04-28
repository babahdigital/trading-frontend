import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { getPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/about/governance',
    {
      title: isEn ? 'Governance — BabahAlgo' : 'Tata Kelola — BabahAlgo',
      description: isEn
        ? 'Governance structure, regulatory compliance, and risk management of BabahAlgo (CV Babah Digital).'
        : 'Struktur tata kelola, kepatuhan regulasi, dan manajemen risiko BabahAlgo (CV Babah Digital).',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

const AUDIT_KEYS = ['audit_b1', 'audit_b2', 'audit_b3', 'audit_b4', 'audit_b5'] as const;
const DATA_KEYS = ['data_b1', 'data_b2', 'data_b3', 'data_b4'] as const;

export default async function GovernancePage() {
  const t = await getTranslations('about_gov_page');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <Link
              href="/about"
              className="t-body-sm text-foreground/60 hover:text-foreground transition-colors mb-4 inline-block"
            >
              {t('back_link')}
            </Link>
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-2xl">
              {t('hero_subtitle')}
            </p>
          </div>
        </section>

        {/* Legal Entity */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('legal_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('legal_title')}</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                {t('legal_p1_pre')} <strong className="text-foreground">{t('legal_p1_strong')}</strong>{t('legal_p1_post')}
              </p>
              <p>{t('legal_p2')}</p>
            </div>
          </div>
        </section>

        {/* Regulatory Status */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('reg_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('reg_title')}</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                {t('reg_p1_pre')} <strong className="text-foreground">{t('reg_p1_strong')}</strong>{t('reg_p1_post')}
              </p>
              <p>{t('reg_p2')}</p>
              <p>{t('reg_p3')}</p>
            </div>
          </div>
        </section>

        {/* Partner Brokers */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('broker_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('broker_title')}</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                {t('broker_p1_pre')}{' '}
                <a
                  href="https://www.exness.com/"
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="text-foreground underline underline-offset-4 hover:text-amber-400 transition-colors"
                >
                  {t('broker_p1_link')}
                </a>
                {t('broker_p1_post')}
              </p>
              <p>{t('broker_p2')}</p>
              <p className="t-body-sm border-l-2 border-border/60 pl-4">
                <strong className="text-foreground">{t('broker_disclosure_strong')}</strong> {t('broker_disclosure_body')}
              </p>
            </div>
          </div>
        </section>

        {/* Audit */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('audit_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('audit_title')}</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>
                {t('audit_intro_pre')} <strong className="text-foreground">{t('audit_intro_strong')}</strong> {t('audit_intro_post')}
              </p>
              <ul className="space-y-3 ml-4">
                {AUDIT_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <p>{t('audit_outro')}</p>
            </div>
          </div>
        </section>

        {/* Conflict of Interest */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('coi_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('coi_title')}</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>{t('coi_intro')}</p>
              <ul className="space-y-3 ml-4">
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('coi_b1_strong')}</strong> {t('coi_b1_body')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('coi_b2_strong')}</strong> {t('coi_b2_body')}
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                  <span>
                    <strong className="text-foreground">{t('coi_b3_strong')}</strong> {t('coi_b3_body')}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Data Privacy */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('data_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('data_title')}</h2>
            <div className="max-w-3xl space-y-4 text-foreground/60 leading-relaxed">
              <p>{t('data_intro')}</p>
              <ul className="space-y-3 ml-4">
                {DATA_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
                    <span>{t(k)}</span>
                  </li>
                ))}
              </ul>
              <p>
                {t('data_outro_pre')}{' '}
                <Link href="/legal/privacy" className="text-foreground underline underline-offset-4 hover:text-amber-400">
                  {t('data_outro_link')}
                </Link>{t('data_outro_post')}
              </p>
            </div>
          </div>
        </section>

        {/* Compliance Contact */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('contact_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('contact_title')}</h2>
            <div className="card-enterprise max-w-md">
              <p className="t-body-sm text-foreground/60 mb-4">
                {t('contact_intro')}
              </p>
              <a
                href="mailto:compliance@babahalgo.com"
                className="font-mono text-sm text-foreground hover:text-amber-400 transition-colors"
              >
                compliance@babahalgo.com
              </a>
              <p className="t-body-sm text-foreground/50 mt-4">
                {t('contact_response')}
              </p>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
