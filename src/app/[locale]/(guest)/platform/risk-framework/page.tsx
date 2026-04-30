import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { Link } from '@/i18n/navigation';
import {
  ArrowLeft, Activity, Layers, Zap, ShieldCheck, ChevronRight,
} from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { getPageMetadata } from '@/lib/seo';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const isEn = locale === 'en';
  return getPageMetadata(
    '/platform/risk-framework',
    {
      title: isEn ? 'Risk Framework — BabahAlgo' : 'Kerangka Risiko — BabahAlgo',
      description: isEn
        ? 'Institutional risk framework: vol-targeted sizing (RiskMetrics + AQR + fractional Kelly), 6-layer exit decision engine, multi-stage kill-switch with AI postmortem, and immutable hash-chained audit trail.'
        : 'Kerangka risiko institusional: vol-targeted sizing (RiskMetrics + AQR + fractional Kelly), exit decision engine 6 layer, multi-stage kill-switch dengan AI postmortem, plus audit trail SHA-256 hash chain.',
    },
    locale === 'en' ? 'en' : 'id',
  );
}

interface RuleEntry {
  nameKey: string;
  descKey: string;
}

interface SectionDef {
  number: '01' | '02' | '03' | '04';
  icon: typeof Activity;
  eyebrowKey: string;
  titleKey: string;
  leadKey: string;
  rules: RuleEntry[];
  citationKey?: string;
}

const SECTIONS: SectionDef[] = [
  {
    number: '01',
    icon: Activity,
    eyebrowKey: 'sec1_eyebrow',
    titleKey: 'sec1_title',
    leadKey: 'sec1_lead',
    citationKey: 'sec1_citation',
    rules: [
      { nameKey: 'sec1_rule1_name', descKey: 'sec1_rule1_desc' },
      { nameKey: 'sec1_rule2_name', descKey: 'sec1_rule2_desc' },
      { nameKey: 'sec1_rule3_name', descKey: 'sec1_rule3_desc' },
      { nameKey: 'sec1_rule4_name', descKey: 'sec1_rule4_desc' },
      { nameKey: 'sec1_rule5_name', descKey: 'sec1_rule5_desc' },
      { nameKey: 'sec1_rule6_name', descKey: 'sec1_rule6_desc' },
    ],
  },
  {
    number: '02',
    icon: Layers,
    eyebrowKey: 'sec2_eyebrow',
    titleKey: 'sec2_title',
    leadKey: 'sec2_lead',
    citationKey: 'sec2_citation_v2',
    rules: [
      { nameKey: 'sec2_layer1_name', descKey: 'sec2_layer1_desc' },
      { nameKey: 'sec2_layer2_name', descKey: 'sec2_layer2_desc' },
      { nameKey: 'sec2_layer25_name', descKey: 'sec2_layer25_desc' },
      { nameKey: 'sec2_layer26_name', descKey: 'sec2_layer26_desc' },
      { nameKey: 'sec2_layer3_name', descKey: 'sec2_layer3_desc' },
      { nameKey: 'sec2_layer4_name', descKey: 'sec2_layer4_desc' },
      { nameKey: 'sec2_layer5_name', descKey: 'sec2_layer5_desc' },
      { nameKey: 'sec2_layer6_name', descKey: 'sec2_layer6_desc' },
    ],
  },
  {
    number: '03',
    icon: Zap,
    eyebrowKey: 'sec3_eyebrow',
    titleKey: 'sec3_title',
    leadKey: 'sec3_lead',
    citationKey: 'sec3_citation',
    rules: [
      { nameKey: 'sec3_trigger1_name', descKey: 'sec3_trigger1_desc' },
      { nameKey: 'sec3_trigger2_name', descKey: 'sec3_trigger2_desc' },
      { nameKey: 'sec3_trigger3_name', descKey: 'sec3_trigger3_desc' },
      { nameKey: 'sec3_state1_name', descKey: 'sec3_state1_desc' },
      { nameKey: 'sec3_state2_name', descKey: 'sec3_state2_desc' },
      { nameKey: 'sec3_state3_name', descKey: 'sec3_state3_desc' },
    ],
  },
  {
    number: '04',
    icon: ShieldCheck,
    eyebrowKey: 'sec4_eyebrow',
    titleKey: 'sec4_title',
    leadKey: 'sec4_lead',
    citationKey: 'sec4_citation',
    rules: [
      { nameKey: 'sec4_item1_name', descKey: 'sec4_item1_desc' },
      { nameKey: 'sec4_item2_name', descKey: 'sec4_item2_desc' },
      { nameKey: 'sec4_item3_name', descKey: 'sec4_item3_desc' },
      { nameKey: 'sec4_item4_name', descKey: 'sec4_item4_desc' },
    ],
  },
];

export default async function RiskFrameworkPage() {
  const t = await getTranslations('platform_risk');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — page-stamp-rule for institutional editorial feel */}
        <section className="section-padding border-b border-border page-stamp-rule">
          <div className="container-default px-4 sm:px-6 relative">
            <Link
              href="/platform"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-8"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2.25} /> {t('back_link')}
            </Link>
            <p className="t-eyebrow mb-4 text-[hsl(var(--primary))]">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6 max-w-3xl">{t('hero_title')}</h1>
            <p className="t-lead text-muted-foreground max-w-3xl">{t('hero_lead')}</p>

            {/* Quick anchor strip */}
            <div className="mt-10 flex flex-wrap gap-2">
              {SECTIONS.map((s) => (
                <a
                  key={s.number}
                  href={`#sec-${s.number}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-muted/40 text-xs font-medium text-foreground/85 hover:border-primary/40 hover:bg-primary/[0.08] hover:text-foreground transition-colors"
                >
                  <span className="font-mono text-[hsl(var(--primary))]">{s.number}</span>
                  {t(s.titleKey)}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Sections */}
        {SECTIONS.map((section, idx) => (
          <section
            key={section.number}
            id={`sec-${section.number}`}
            className={`section-padding ${idx < SECTIONS.length - 1 ? 'border-b border-border/60' : ''} scroll-mt-24`}
          >
            <div className="container-default px-4 sm:px-6">
              {/* Section header */}
              <div className="mb-12 max-w-3xl">
                <div className="flex items-center gap-3 mb-4">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/[0.08] text-[hsl(var(--primary))]">
                    <section.icon className="h-5 w-5" strokeWidth={2.25} />
                  </span>
                  <span className="font-mono text-sm uppercase tracking-wider text-muted-foreground">
                    {section.number} · {t(section.eyebrowKey)}
                  </span>
                </div>
                <h2 className="t-display-section mb-4">{t(section.titleKey)}</h2>
                <p className="t-body text-muted-foreground leading-relaxed">{t(section.leadKey)}</p>
                {section.citationKey ? (
                  <p className="mt-4 text-xs text-muted-foreground/70 font-mono uppercase tracking-wider">
                    {t(section.citationKey)}
                  </p>
                ) : null}
              </div>

              {/* Rules grid */}
              <div className="grid md:grid-cols-2 gap-x-10 gap-y-8 lg:gap-y-10 max-w-5xl">
                {section.rules.map((rule, i) => (
                  <div key={rule.nameKey} className="relative pl-8">
                    <span className="absolute left-0 top-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md border border-border bg-card text-[10px] font-mono text-muted-foreground">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h3 className="font-display text-lg text-foreground mb-2 leading-snug">
                      {t(rule.nameKey)}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {t(rule.descKey)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}

        {/* CTA */}
        <section className="section-padding border-t border-border">
          <div className="container-default px-4 sm:px-6 text-center max-w-2xl mx-auto">
            <p className="t-eyebrow mb-3">{t('cta_eyebrow')}</p>
            <h2 className="t-display-sub mb-6">{t('cta_title')}</h2>
            <p className="t-body text-muted-foreground mb-8">{t('cta_body')}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/contact" className="btn-primary">
                {t('cta_primary')}
                <ChevronRight className="w-4 h-4" strokeWidth={2.25} />
              </Link>
              <Link href="/platform/execution" className="btn-secondary">
                {t('cta_secondary')}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
  );
}
