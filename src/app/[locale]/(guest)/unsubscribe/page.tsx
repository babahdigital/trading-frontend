/**
 * Unsubscribe confirmation landing page.
 *
 * Diakses via redirect dari /api/public/unsubscribe setelah token/email
 * diproses. Bilingual via SSR getTranslations.
 */
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { CheckCircle2 } from 'lucide-react';
import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'unsubscribe_page' });
  return {
    title: t('meta_title'),
    description: t('meta_description'),
    robots: { index: false, follow: false },
  };
}

export default async function UnsubscribePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'unsubscribe_page' });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 max-w-xl mx-auto text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[hsl(var(--profit))/15] border border-[hsl(var(--profit))/30] mb-6">
              <CheckCircle2 className="h-8 w-8 text-[hsl(var(--profit))]" strokeWidth={2} />
            </div>
            <h1 className="t-display-page mb-4">{t('title')}</h1>
            <p className="t-lead text-foreground/60 mb-8">{t('body')}</p>
            <p className="text-sm text-muted-foreground mb-8">{t('feedback')}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link href="/" className="btn-tertiary text-sm">
                {t('back_home')}
              </Link>
              <Link href="/contact" className="btn-tertiary text-sm">
                {t('contact_link')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
