const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
  { step: '04', titleKey: 'step4_title', descKey: 'step4_desc' },
] as const;

interface StepsSectionProps {
  t: (key: string) => string;
}

export function StepsSection({ t }: StepsSectionProps) {
  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('steps_eyebrow')}</p>
        <h2 className="t-display-section mb-8 sm:mb-12 max-w-xl sm:max-w-2xl">{t('steps_title')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEP_META.map((s) => (
            <div key={s.step} className="card-enterprise">
              <div className="t-eyebrow mb-3 text-amber-400">{s.step}</div>
              <h3 className="text-base font-semibold mb-2">{t(s.titleKey)}</h3>
              <p className="t-body-sm text-foreground/65 leading-relaxed">{t(s.descKey)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
