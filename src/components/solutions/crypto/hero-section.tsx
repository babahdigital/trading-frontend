import { Link } from '@/i18n/navigation';
import { TrustStrip } from '@/components/shared/trust-strip';
import { ArrowRight, Bitcoin } from 'lucide-react';

interface HeroSectionProps {
  t: (key: string) => string;
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="t-eyebrow mb-1">{label}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-[11px] text-foreground/50 font-mono mt-0.5">{sub}</div>
    </div>
  );
}

export function HeroSection({ t }: HeroSectionProps) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <div className="hero-section-header">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-700 dark:text-amber-300 mb-6">
            <Bitcoin className="w-3.5 h-3.5" />
            {t('hero_pill')}
          </div>
          <h1 className="t-display-page mb-5">
            {t('hero_title_l1')} {t('hero_title_l2')}
          </h1>
          <p className="t-lead text-foreground/70 mb-8">
            {t('hero_subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
            <Link href="/register?service=crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
              {t('hero_cta_register')} <ArrowRight className="w-4 h-4" />
            </Link>
            <Link href="/demo?product=robot-crypto" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
              {t('hero_cta_demo')}
            </Link>
            <Link href="/contact?subject=crypto-consultation" className="btn-tertiary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
              {t('hero_cta_consult')}
            </Link>
          </div>
          <p className="text-xs text-foreground/50 mt-6">
            {t('hero_beta_note')}
          </p>
          <div className="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-sm">
            <Stat label={t('stat1_label')} value={t('stat1_value')} sub={t('stat1_sub')} />
            <Stat label={t('stat2_label')} value={t('stat2_value')} sub={t('stat2_sub')} />
            <Stat label={t('stat3_label')} value={t('stat3_value')} sub={t('stat3_sub')} />
            <Stat label={t('stat4_label')} value={t('stat4_value')} sub={t('stat4_sub')} />
          </div>
          <div className="mt-10">
            <TrustStrip />
          </div>
        </div>
      </div>
    </section>
  );
}
