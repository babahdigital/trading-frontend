'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import {
  ArrowRight, BarChart3, Clock, Shield, Send, FileText, LineChart,
  Cpu, Activity, Award, Check,
} from 'lucide-react';
import { financialProductSchema, ldJson, breadcrumbSchema, faqPageSchema } from '@/lib/seo-jsonld';

const FEATURE_META = [
  { titleKey: 'feat1_title', descKey: 'feat1_desc', icon: 'cpu' },
  { titleKey: 'feat2_title', descKey: 'feat2_desc', icon: 'chart' },
  { titleKey: 'feat3_title', descKey: 'feat3_desc', icon: 'shield' },
  { titleKey: 'feat4_title', descKey: 'feat4_desc', icon: 'send' },
  { titleKey: 'feat5_title', descKey: 'feat5_desc', icon: 'file' },
  { titleKey: 'feat6_title', descKey: 'feat6_desc', icon: 'line' },
] as const;

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  cpu: <Cpu className="w-5 h-5 text-amber-400" />,
  chart: <BarChart3 className="w-5 h-5 text-amber-400" />,
  clock: <Clock className="w-5 h-5 text-amber-400" />,
  shield: <Shield className="w-5 h-5 text-amber-400" />,
  send: <Send className="w-5 h-5 text-amber-400" />,
  file: <FileText className="w-5 h-5 text-amber-400" />,
  line: <LineChart className="w-5 h-5 text-amber-400" />,
  activity: <Activity className="w-5 h-5 text-amber-400" />,
  award: <Award className="w-5 h-5 text-amber-400" />,
};

interface PricingMeta {
  tier: string;
  name: string;
  price: string;
  popular?: boolean;
  taglineKey: 'tier1_tagline' | 'tier2_tagline' | 'tier3_tagline';
  ctaKey: 'tier1_cta' | 'tier2_cta' | 'tier3_cta';
  featuresKey: 'tier1_features' | 'tier2_features' | 'tier3_features';
  href: string;
}

const PRICING_META: PricingMeta[] = [
  { tier: 'TIER 1', name: 'Robot Meta · Swing', price: '$19', taglineKey: 'tier1_tagline', ctaKey: 'tier1_cta', featuresKey: 'tier1_features', href: '/register/signal?tier=swing' },
  { tier: 'TIER 2', name: 'Robot Meta · Scalping', price: '$79', popular: true, taglineKey: 'tier2_tagline', ctaKey: 'tier2_cta', featuresKey: 'tier2_features', href: '/register/signal?tier=scalping' },
  { tier: 'TIER 3', name: 'Robot Meta · All-In', price: '$299', taglineKey: 'tier3_tagline', ctaKey: 'tier3_cta', featuresKey: 'tier3_features', href: '/register/signal?tier=all' },
];

const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
] as const;

const FAQ_KEYS = [
  { qKey: 'faq_q1', aKey: 'faq_a1' },
  { qKey: 'faq_q2', aKey: 'faq_a2' },
  { qKey: 'faq_q3', aKey: 'faq_a3' },
  { qKey: 'faq_q4', aKey: 'faq_a4' },
  { qKey: 'faq_q5', aKey: 'faq_a5' },
  { qKey: 'faq_q6', aKey: 'faq_a6' },
] as const;

const AUDIENCE_KEYS = ['audience_b1', 'audience_b2', 'audience_b3', 'audience_b4'] as const;

// Heuristic: detect Indonesian-language strings so we can fall back to i18n
// when the CMS-provided FAQ is in the wrong locale. Looks for common Bahasa
// Indonesian function words that don't appear in English.
const ID_MARKERS = /\b(anda|tidak|adalah|atau|dengan|untuk|yang|tetap|kami|saja|bagaimana|apakah|apa|berapa|akun|bulan|hari)\b/i;
function looksIndonesian(text: string): boolean {
  return ID_MARKERS.test(text);
}

interface FaqItem {
  q: string;
  a: string;
}

export default function SignalPage() {
  const t = useTranslations('solutions_signal');
  const locale = useLocale();
  const fallbackFaq = useMemo<FaqItem[]>(
    () => FAQ_KEYS.map((k) => ({ q: t(k.qKey), a: t(k.aKey) })),
    [t]
  );
  const [faq, setFaq] = useState<FaqItem[]>(fallbackFaq);

  useEffect(() => {
    let cancelled = false;
    async function loadFaq() {
      try {
        const res = await fetch(`/api/public/faq?category=PRICING&locale=${locale}`);
        if (!res.ok) return;
        const data = await res.json();
        if (!Array.isArray(data) || data.length === 0) return;
        const cmsFaq: FaqItem[] = data.map((item: Record<string, unknown>) => ({
          q: (item.question as string) || (item.q as string) || '',
          a: (item.answer as string) || (item.a as string) || '',
        }));
        // If active locale is English but CMS returns Indonesian (no en
        // translations populated yet), keep i18n fallback to avoid mixed-locale
        // FAQ on the EN page.
        if (locale === 'en' && cmsFaq.some((f) => looksIndonesian(f.q) || looksIndonesian(f.a))) {
          return;
        }
        if (!cancelled) setFaq(cmsFaq);
      } catch {
        // keep fallback
      }
    }
    loadFaq();
    return () => { cancelled = true; };
  }, [locale]);

  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'Robot Meta', url: '/solutions/signal' },
  ]);
  const faqJson = faqPageSchema(faq.map((f) => ({ question: f.q, answer: f.a })));
  const tierProducts = PRICING_META.map((tier) => {
    const features = t.raw(tier.featuresKey) as string[];
    return financialProductSchema({
      name: `${tier.name} — ${tier.price}/mo`,
      description: features.join(' · '),
      price: tier.price.replace(/[^0-9.]/g, ''),
      currency: 'USD',
      url: '/solutions/signal',
    });
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqJson) }} />
      {tierProducts.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(schema) }} />
      ))}
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>
            <h1 className="t-display-page mb-6">
              {t('hero_title_l1')}<br className="hidden sm:block" /> {t('hero_title_l2')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-xl sm:max-w-2xl">
              {t('hero_subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4 mt-8 sm:mt-10">
              <Link href="/register/signal?tier=scalping" className="btn-primary justify-center">
                {t('hero_cta_register')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo?product=robot-meta" className="btn-secondary justify-center">
                {t('hero_cta_demo')}
              </Link>
              <Link href="/performance" className="btn-tertiary justify-center">
                {t('hero_cta_track')}
              </Link>
            </div>
            <p className="text-xs text-foreground/50 mt-6 max-w-xl sm:max-w-2xl">
              {t('hero_beta_note')}
            </p>
          </div>
        </section>

        {/* Pricing — 3-tier card layout */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('pricing_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('pricing_title')}</h2>
            <p className="t-body text-foreground/60 mb-10 max-w-2xl">
              {t('pricing_body')}
            </p>

            <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
              {PRICING_META.map((tier) => (
                <div
                  key={tier.name}
                  className={`rounded-xl p-5 sm:p-6 md:p-7 border transition-colors ${
                    tier.popular
                      ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/[0.02]'
                      : 'border-border/80 hover:border-amber-500/30 bg-card'
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="t-eyebrow text-amber-400">{tier.tier}</span>
                    {tier.popular && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-medium tracking-wider uppercase">
                        {t('popular_badge')}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-xl font-medium mb-1">{tier.name}</h3>
                  <p className="t-body-sm text-muted-foreground mb-4">{t(tier.taglineKey)}</p>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="font-mono text-3xl font-semibold">{tier.price}</span>
                    <span className="t-body-sm text-foreground/40">/mo</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {(t.raw(tier.featuresKey) as string[]).map((f) => (
                      <li key={f} className="flex items-start gap-2 t-body-sm text-foreground/85">
                        <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span className="break-words">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.href}
                    className={`w-full justify-center ${tier.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t(tier.ctaKey)}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-y-12 lg:gap-x-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">{t('audience_eyebrow')}</p>
                <h2 className="t-display-sub">{t('audience_title')}</h2>
              </div>
              <ul className="lg:col-span-3 space-y-5 t-body text-foreground/70">
                {AUDIENCE_KEYS.map((k) => (
                  <li key={k} className="flex items-start gap-3">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    {t(k)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Features grid */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('features_eyebrow')}</p>
            <h2 className="t-display-sub mb-8 sm:mb-12">{t('features_title')}</h2>
            <div className="grid md:grid-cols-2 gap-x-8 lg:gap-x-12 gap-y-8 sm:gap-y-10">
              {FEATURE_META.map((f) => (
                <div key={f.titleKey} className="flex items-start gap-4 sm:gap-5">
                  <div className="w-11 h-11 rounded-lg border border-border/60 bg-muted/40 flex items-center justify-center shrink-0">
                    {FEATURE_ICONS[f.icon]}
                  </div>
                  <div>
                    <h3 className="text-base font-medium mb-1.5">{t(f.titleKey)}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{t(f.descKey)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('onboard_eyebrow')}</p>
            <h2 className="t-display-sub mb-8 sm:mb-12">{t('onboard_title')}</h2>
            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {STEP_META.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-5xl text-amber-500/20 mb-4">{step.step}</p>
                  <h3 className="text-lg font-medium mb-2">{t(step.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/60 leading-relaxed">{t(step.descKey)}</p>
                  {i < STEP_META.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-6 -right-5 w-5 h-5 text-foreground/20" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-y-12 lg:gap-x-16">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">{t('faq_eyebrow')}</p>
                <h2 className="t-display-sub">{t('faq_title')}</h2>
              </div>
              <div className="lg:col-span-3 space-y-6 sm:space-y-8">
                {faq.map((item) => (
                  <div key={item.q} className="border-b border-border/40 pb-6 sm:pb-8 last:border-b-0">
                    <h3 className="text-base font-medium mb-2">{item.q}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{item.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding text-center">
          <div className="container-default px-4 sm:px-6">
            <h2 className="t-display-sub mb-4">{t('cta_title')}</h2>
            <p className="t-body text-foreground/60 mb-8 max-w-lg mx-auto">
              {t('cta_body')}
            </p>
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-center gap-3 sm:gap-4">
              <Link href="/contact?subject=beta-founding-member" className="btn-primary justify-center">
                {t('cta_primary')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/demo?product=robot-meta" className="btn-secondary justify-center">
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
