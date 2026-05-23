import { Cpu, ShieldCheck, Activity, AlertOctagon, Zap, KeyRound } from 'lucide-react';

const FEATURE_META = [
  { icon: Cpu, titleKey: 'feat1_title', descKey: 'feat1_desc' },
  { icon: ShieldCheck, titleKey: 'feat2_title', descKey: 'feat2_desc' },
  { icon: Activity, titleKey: 'feat3_title', descKey: 'feat3_desc' },
  { icon: AlertOctagon, titleKey: 'feat4_title', descKey: 'feat4_desc' },
  { icon: Zap, titleKey: 'feat5_title', descKey: 'feat5_desc' },
  { icon: KeyRound, titleKey: 'feat6_title', descKey: 'feat6_desc' },
] as const;

interface FeaturesGridProps {
  t: (key: string) => string;
}

export function FeaturesGrid({ t }: FeaturesGridProps) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('feat_eyebrow')}</p>
        <h2 className="t-display-section mb-8 sm:mb-12 max-w-xl sm:max-w-2xl">
          {t('feat_title')}
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURE_META.map((f) => (
            <div key={f.titleKey} className="card-enterprise">
              <div className="icon-container mb-4">
                <f.icon className="w-5 h-5 text-amber-400" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t(f.titleKey)}</h3>
              <p className="t-body-sm text-foreground/65 leading-relaxed">{t(f.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
