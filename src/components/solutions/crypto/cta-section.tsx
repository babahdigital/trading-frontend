import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';

interface CtaSectionProps {
  t: (key: string) => string;
}

export function CtaSection({ t }: CtaSectionProps) {
  return (
    <section className="section-padding">
      <div className="layout-container text-center max-w-3xl mx-auto">
        <h2 className="t-display-section mb-4">{t('cta_title')}</h2>
        <p className="t-body text-foreground/60 mb-8">
          {t('cta_body')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register?service=crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
            {t('cta_primary')} <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/contact" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
            {t('cta_secondary')}
          </Link>
        </div>
        <p className="text-xs text-foreground/40 mt-8 max-w-xl mx-auto leading-relaxed">
          <strong>{t('cta_disclaimer_strong')}</strong> {t('cta_disclaimer_body')}
        </p>
      </div>
    </section>
  );
}
