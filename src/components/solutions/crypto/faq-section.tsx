const FAQ_KEYS = [
  { qKey: 'faq_q1', aKey: 'faq_a1' },
  { qKey: 'faq_q2', aKey: 'faq_a2' },
  { qKey: 'faq_q3', aKey: 'faq_a3' },
  { qKey: 'faq_q4', aKey: 'faq_a4' },
  { qKey: 'faq_q5', aKey: 'faq_a5' },
  { qKey: 'faq_q6', aKey: 'faq_a6' },
  { qKey: 'faq_q7', aKey: 'faq_a7' },
  { qKey: 'faq_q8', aKey: 'faq_a8' },
] as const;

interface FaqSectionProps {
  t: (key: string) => string;
}

export function FaqSection({ t }: FaqSectionProps) {
  const items = FAQ_KEYS.map((k) => ({ q: t(k.qKey), a: t(k.aKey) }));

  return (
    <section className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('faq_eyebrow')}</p>
        <h2 className="t-display-section mb-8 sm:mb-12 max-w-xl sm:max-w-2xl">{t('faq_title')}</h2>
        <div className="grid md:grid-cols-2 gap-x-8 lg:gap-x-10 gap-y-6 sm:gap-y-8 max-w-5xl">
          {items.map((item) => (
            <div key={item.q}>
              <h3 className="text-base font-semibold mb-2 leading-snug">{item.q}</h3>
              <p className="t-body-sm text-foreground/70 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Re-export FAQ_KEYS for LD+JSON schema generation in page.tsx */
export { FAQ_KEYS };
