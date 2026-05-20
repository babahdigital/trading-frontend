'use client';

/**
 * Institutional flow — Cal.com booking embed + process showcase.
 */
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ArrowRight } from 'lucide-react';
import { CalEmbed } from '@/components/ui/cal-embed';
import type { ServiceDescriptor } from '@/lib/register/service-registry';

interface InstitutionalBookingProps {
  service: ServiceDescriptor;
  locale: 'id' | 'en';
}

const STEP_KEYS = [
  { step: '01', titleKey: 'institutional.step1_title', descKey: 'institutional.step1_desc' },
  { step: '02', titleKey: 'institutional.step2_title', descKey: 'institutional.step2_desc' },
  { step: '03', titleKey: 'institutional.step3_title', descKey: 'institutional.step3_desc' },
  { step: '04', titleKey: 'institutional.step4_title', descKey: 'institutional.step4_desc' },
] as const;

export function InstitutionalBooking({ service }: InstitutionalBookingProps) {
  const t = useTranslations('register');

  return (
    <div className="w-full" style={{ maxWidth: 'min(720px, 100%)' }}>
      <p className="t-eyebrow mb-4">{t(service.wizard.eyebrowKey)}</p>
      <h1 className="t-display-sub mb-4">{t(service.wizard.titleKey)}</h1>
      <p className="t-lead text-foreground/60 mb-10 max-w-2xl">
        {t(service.wizard.subtitleKey)}{' '}
        <strong className="text-amber-300">{t('institutional.lead_zero_custody')}</strong>{' '}
        {t('institutional.lead_part2')}
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        {STEP_KEYS.map((item) => (
          <div key={item.step} className="rounded-lg border border-border/60 bg-card p-4">
            <div className="font-mono text-amber-400 text-xs mb-2">{item.step}</div>
            <h3 className="font-display text-xs sm:text-sm font-semibold mb-1.5 leading-tight">
              {t(item.titleKey)}
            </h3>
            <p className="t-body-sm text-foreground/60 text-xs leading-relaxed">
              {t(item.descKey)}
            </p>
          </div>
        ))}
      </div>

      <h2 className="t-display-sub mb-2">{t('institutional.schedule_title')}</h2>
      <p className="t-body-sm text-foreground/60 mb-6">
        {t('institutional.schedule_subtitle')}
      </p>
      <div className="border border-border/60 rounded-lg overflow-hidden bg-card mb-8">
        <CalEmbed calLink="babahalgo/institutional" />
      </div>

      <div className="text-center pt-6 border-t border-border/60">
        <p className="text-foreground/60 mb-3 text-sm">{t('institutional.contact_intro')}</p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 text-foreground/50 hover:text-amber-400 transition-colors text-sm"
        >
          {t('institutional.contact_link')}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
