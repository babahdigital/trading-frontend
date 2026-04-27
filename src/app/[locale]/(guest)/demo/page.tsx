import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import {
  ArrowRight, ShieldCheck, Bitcoin, TrendingUp, Sparkles,
  AlertTriangle, Check,
} from 'lucide-react';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, financialProductSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return getPageMetadata('/demo', {
    title: 'Demo Gratis — Robot Meta · Robot Crypto · Indicator | BabahAlgo',
    description:
      'Coba Robot Meta (MT5 demo) atau Robot Crypto (Binance Testnet) gratis selama beta. Tidak masuk track record live. Upgrade ke tier berbayar kapan saja.',
  });
}

interface TrackMeta {
  icon: typeof TrendingUp;
  eyebrowKey: 'track1_eyebrow' | 'track2_eyebrow' | 'track3_eyebrow';
  titleKey: 'track1_title' | 'track2_title' | 'track3_title';
  taglineKey: 'track1_tagline' | 'track2_tagline' | 'track3_tagline';
  bulletKeys: readonly ['track1_b1' | 'track2_b1' | 'track3_b1', string, string, string, string];
  ctaKey: 'track1_cta' | 'track2_cta' | 'track3_cta';
  href: string;
  popular?: boolean;
}

const TRACK_META: TrackMeta[] = [
  {
    icon: TrendingUp,
    eyebrowKey: 'track1_eyebrow',
    titleKey: 'track1_title',
    taglineKey: 'track1_tagline',
    bulletKeys: ['track1_b1', 'track1_b2', 'track1_b3', 'track1_b4', 'track1_b5'],
    ctaKey: 'track1_cta',
    href: '/register/signal?mode=demo&product=robot-meta',
    popular: true,
  },
  {
    icon: Bitcoin,
    eyebrowKey: 'track2_eyebrow',
    titleKey: 'track2_title',
    taglineKey: 'track2_tagline',
    bulletKeys: ['track2_b1', 'track2_b2', 'track2_b3', 'track2_b4', 'track2_b5'],
    ctaKey: 'track2_cta',
    href: '/register/crypto?mode=demo',
  },
  {
    icon: Sparkles,
    eyebrowKey: 'track3_eyebrow',
    titleKey: 'track3_title',
    taglineKey: 'track3_tagline',
    bulletKeys: ['track3_b1', 'track3_b2', 'track3_b3', 'track3_b4', 'track3_b5'],
    ctaKey: 'track3_cta',
    href: '/contact?subject=indicator-beta',
  },
];

const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
  { step: '04', titleKey: 'step4_title', descKey: 'step4_desc' },
] as const;

export default async function DemoPage() {
  const t = await getTranslations('demo_page');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Demo', url: '/demo' },
  ]);
  const demoProduct = financialProductSchema({
    name: 'Demo Gratis — Robot Meta · Robot Crypto · Indicator',
    description: 'Tiga jalur demo paralel: Robot Meta di MT5 demo, Robot Crypto di Binance Testnet, atau Indicator overlay permanent-free.',
    price: '0',
    currency: 'USD',
    url: '/demo',
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(demoProduct) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-300 mb-6">
                <Sparkles className="w-3.5 h-3.5" />
                {t('hero_pill')}
              </div>
              <h1 className="t-display-page mb-5">
                {t('hero_title_l1')}<br className="hidden sm:block" /> {t('hero_title_l2')}
              </h1>
              <p className="t-lead text-foreground/70 mb-8 max-w-xl sm:max-w-2xl">
                {t('hero_subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <Link href="/register/signal?mode=demo&product=robot-meta" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_meta')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/register/crypto?mode=demo" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_crypto')}
                </Link>
                <Link href="/contact?subject=indicator-beta" className="btn-tertiary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_indicator')}
                </Link>
              </div>
              <p className="text-xs text-muted-foreground mt-6">
                {t('hero_note')}
              </p>
            </div>
          </div>
        </section>

        {/* Demo isolation banner */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="rounded-lg border-2 border-amber-500/40 bg-amber-500/5 p-5 sm:p-6 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-amber-200 mb-1.5">
                  {t('isolation_title')}
                </h2>
                <p className="text-sm text-amber-200/80 leading-relaxed">
                  {t('isolation_body_part1')}{' '}
                  <code className="font-mono px-1 bg-amber-500/10 rounded">{t('isolation_simulation')}</code>{' '}
                  {t('isolation_body_part2')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3-track demo cards */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('tracks_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('tracks_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
              {t('tracks_subtitle')}
            </p>
            <div className="grid md:grid-cols-3 gap-5 sm:gap-6">
              {TRACK_META.map((track) => (
                <div
                  key={track.titleKey}
                  className={`rounded-xl p-5 sm:p-6 md:p-7 border transition-colors ${
                    track.popular
                      ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-500/[0.02]'
                      : 'border-border/80 bg-card hover:border-amber-500/30'
                  }`}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div className="icon-container">
                      <track.icon className="w-5 h-5 text-amber-400" />
                    </div>
                    {track.popular && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[11px] font-medium tracking-wider uppercase">
                        {t('popular_badge')}
                      </span>
                    )}
                  </div>
                  <p className="t-eyebrow text-amber-400 mb-2">{t(track.eyebrowKey)}</p>
                  <h3 className="font-display text-xl font-medium mb-2">{t(track.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed mb-5">
                    {t(track.taglineKey)}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {track.bulletKeys.map((bk) => (
                      <li key={bk} className="flex items-start gap-2 t-body-sm text-foreground/85">
                        <Check className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                        <span>{t(bk as Parameters<typeof t>[0])}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={track.href}
                    className={`w-full justify-center ${track.popular ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {t(track.ctaKey)}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('steps_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('steps_title')}</h2>
            <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
              {t('steps_subtitle')}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
              {STEP_META.map((s) => (
                <div key={s.step} className="rounded-xl border border-border/80 bg-card p-5 sm:p-6">
                  <div className="t-eyebrow mb-3 text-amber-400">{s.step}</div>
                  <h3 className="text-base font-semibold mb-2">{t(s.titleKey)}</h3>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{t(s.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What happens after demo */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-y-12 lg:gap-x-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-3">{t('after_eyebrow')}</p>
                <h2 className="t-display-sub">{t('after_title')}</h2>
              </div>
              <div className="lg:col-span-3 space-y-5 t-body text-foreground/70">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">{t('after_p1_strong')}</span>{' '}
                    {t('after_p1_body')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">{t('after_p2_strong')}</span>{' '}
                    {t('after_p2_body')}
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <ArrowRight className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                  <p>
                    <span className="font-medium text-foreground">{t('after_p3_strong')}</span>{' '}
                    {t('after_p3_body')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center max-w-3xl mx-auto">
            <h2 className="t-display-sub mb-4">{t('cta_title')}</h2>
            <p className="t-body text-foreground/60 mb-8">
              {t('cta_body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register/signal?mode=demo&product=robot-meta" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                {t('cta_primary')} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/pricing" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
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
