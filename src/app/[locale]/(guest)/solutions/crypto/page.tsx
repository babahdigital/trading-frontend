import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { getPageMetadata } from '@/lib/seo';
import { breadcrumbSchema, faqPageSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import {
  ArrowRight,
  Bitcoin,
  ShieldCheck,
  Zap,
  Cpu,
  Activity,
  KeyRound,
  AlertOctagon,
  Check,
  TrendingUp,
} from 'lucide-react';

export async function generateMetadata() {
  return getPageMetadata('/solutions/crypto', {
    title: 'Robot Crypto — Auto-trading di Binance | BabahAlgo',
    description:
      'Robot Crypto institusional untuk Binance Spot + USDT-M Futures. Strategi SMC, Wyckoff, dan momentum 24/7 dengan framework risiko 12-layer. Modal tetap di akun Binance Anda — tidak ada custody dana.',
  });
}

const FEATURE_META = [
  { icon: Cpu, titleKey: 'feat1_title', descKey: 'feat1_desc' },
  { icon: ShieldCheck, titleKey: 'feat2_title', descKey: 'feat2_desc' },
  { icon: Activity, titleKey: 'feat3_title', descKey: 'feat3_desc' },
  { icon: AlertOctagon, titleKey: 'feat4_title', descKey: 'feat4_desc' },
  { icon: Zap, titleKey: 'feat5_title', descKey: 'feat5_desc' },
  { icon: KeyRound, titleKey: 'feat6_title', descKey: 'feat6_desc' },
] as const;

interface TierMeta {
  id: string;
  name: string;
  price: string;
  popular?: boolean;
  descKey: 'tier_basic_desc' | 'tier_pro_desc' | 'tier_hnwi_desc';
  ctaKey: 'tier_basic_cta' | 'tier_pro_cta' | 'tier_hnwi_cta';
  pfKey: 'tier_basic_pf' | 'tier_pro_pf' | 'tier_hnwi_pf';
  features: readonly string[];
}

const TIERS_META: TierMeta[] = [
  {
    id: 'basic',
    name: 'Crypto Basic',
    price: '$49',
    descKey: 'tier_basic_desc',
    ctaKey: 'tier_basic_cta',
    pfKey: 'tier_basic_pf',
    features: [
      '3 pair otomatis (top-3 dynamic ranking)',
      'Leverage maksimal 5x',
      '3 posisi paralel',
      'Strategi: scalping_momentum',
      'Notifikasi Telegram + dashboard',
      'Email support',
    ],
  },
  {
    id: 'pro',
    name: 'Crypto Pro',
    price: '$199',
    popular: true,
    descKey: 'tier_pro_desc',
    ctaKey: 'tier_pro_cta',
    pfKey: 'tier_pro_pf',
    features: [
      '8 pair otomatis (top-8 + 1 manual whitelist)',
      'Leverage maksimal 10x',
      '5 posisi paralel',
      'Strategi: SMC, Wyckoff, Momentum, Mean Reversion',
      'Live equity polling 5 detik',
      'Telegram VIP + priority support',
    ],
  },
  {
    id: 'hnwi',
    name: 'Crypto HNWI',
    price: '$499',
    descKey: 'tier_hnwi_desc',
    ctaKey: 'tier_hnwi_cta',
    pfKey: 'tier_hnwi_pf',
    features: [
      '12 pair + custom whitelist/blacklist',
      'Leverage maksimal 15x',
      '8 posisi paralel',
      'Semua strategi + parameter tuning',
      'Dedicated account manager',
      'SLA 99.9% + monthly review call',
    ],
  },
];

const STRATEGY_META = [
  { nameKey: 'strat1_name', descKey: 'strat1_desc', timeframe: 'M5/M15', market: 'Futures' },
  { nameKey: 'strat2_name', descKey: 'strat2_desc', timeframe: 'H1/H4', market: 'Spot + Futures' },
  { nameKey: 'strat3_name', descKey: 'strat3_desc', timeframe: 'H4', market: 'Spot + Futures' },
  { nameKey: 'strat4_name', descKey: 'strat4_desc', timeframe: 'M15', market: 'Futures' },
  { nameKey: 'strat5_name', descKey: 'strat5_desc', timeframe: 'H4', market: 'Spot' },
  { nameKey: 'strat6_name', descKey: 'strat6_desc', timeframe: 'H4', market: 'Spot' },
] as const;

const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
  { step: '04', titleKey: 'step4_title', descKey: 'step4_desc' },
] as const;

const FAQ_ITEMS = [
  {
    q: 'Bot ini berbeda dari copy-trading biasa?',
    a: 'Berbeda. Copy-trading meniru posisi trader lain. Bot kami menjalankan algoritma kuantitatif independen — strategi sudah backtested, ada risk overlay, dan tidak bergantung pada satu trader. Performance reproducible.',
  },
  {
    q: 'Bagaimana keamanan API key?',
    a: 'Kami WAJIB customer membuat API key dengan permission "Enable Reading" dan "Enable Futures Trade" SAJA — JANGAN aktifkan "Enable Withdrawals". Backend kami juga akan REJECT key yang punya withdraw permission. Selain itu, key dienkripsi via Fernet + HashiCorp Vault.',
  },
  {
    q: 'Berapa modal minimum untuk Crypto Basic?',
    a: 'Rekomendasi minimum $500 USDT di Binance Futures untuk Basic ($1,000 untuk Pro, $10,000 untuk HNWI). Jumlah lebih kecil tetap bisa, namun position sizing 1% akan terbatas dan compound effect berkurang.',
  },
  {
    q: 'Apa expected win rate dan drawdown?',
    a: 'Berdasarkan backtest 2 tahun: win rate 55-62% (lebih rendah dari forex karena volatilitas), namun risk-reward rata-rata 1:2.3 sehingga profit factor positif. Max drawdown historis -12.5% pada periode crash 2024-Q3.',
  },
  {
    q: 'Apakah bisa pakai testnet dulu?',
    a: 'Bisa. Saat submit API key ada toggle "testnet". Bot akan menjalankan strategi di Binance Testnet (uang simulasi) dengan flow yang sama persis. Banyak customer pakai 1 minggu testnet sebelum live.',
  },
  {
    q: 'Bagaimana kalau Binance maintenance atau saya mau pause sementara?',
    a: 'Customer bisa trigger kill switch self-serve di /portal/crypto/risk dengan alasan. Bot halt dispatcher pass — posisi terbuka tetap dengan SL/TP, tidak force-close. Setelah maintenance selesai, kontak support untuk cabut kill switch.',
  },
];

export default async function CryptoBotSolutionPage() {
  const t = await getTranslations('solutions_crypto');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions/signal' },
    { name: 'Robot Crypto', url: '/solutions/crypto' },
  ]);
  const faq = faqPageSchema(FAQ_ITEMS.map((f) => ({ question: f.q, answer: f.a })));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faq) }} />
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs font-mono uppercase tracking-wider text-amber-300 mb-6">
                <Bitcoin className="w-3.5 h-3.5" />
                {t('hero_pill')}
              </div>
              <h1 className="t-display-page mb-5">
                {t('hero_title_l1')}<br />{t('hero_title_l2')}
              </h1>
              <p className="t-lead text-foreground/70 mb-8 max-w-2xl">
                {t('hero_subtitle')}
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/register/crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_register')} <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/demo?product=robot-crypto" className="btn-secondary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_demo')}
                </Link>
                <Link href="/contact?subject=crypto-consultation" className="btn-tertiary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
                  {t('hero_cta_consult')}
                </Link>
              </div>
              <p className="text-xs text-foreground/50 mt-6 max-w-2xl">
                {t('hero_beta_note')}
              </p>
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
                <Stat label={t('stat1_label')} value={t('stat1_value')} sub={t('stat1_sub')} />
                <Stat label={t('stat2_label')} value={t('stat2_value')} sub={t('stat2_sub')} />
                <Stat label={t('stat3_label')} value={t('stat3_value')} sub={t('stat3_sub')} />
                <Stat label={t('stat4_label')} value={t('stat4_value')} sub={t('stat4_sub')} />
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('feat_eyebrow')}</p>
            <h2 className="t-display-section mb-12 max-w-2xl">
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

        {/* Strategies */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('strat_eyebrow')}</p>
            <h2 className="t-display-section mb-3 max-w-2xl">{t('strat_title')}</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              {t('strat_subtitle')}
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {STRATEGY_META.map((s) => (
                <div key={s.nameKey} className="card-enterprise group">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <h3 className="text-base font-semibold">{t(s.nameKey)}</h3>
                    <TrendingUp className="w-4 h-4 text-amber-400 shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                      {s.timeframe}
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded border border-border bg-muted/40 text-muted-foreground">
                      {s.market}
                    </span>
                  </div>
                  <p className="t-body-sm text-foreground/65 leading-relaxed">{t(s.descKey)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('pricing_eyebrow')}</p>
            <h2 className="t-display-section mb-3 max-w-2xl">{t('pricing_title')}</h2>
            <p className="t-body text-foreground/60 max-w-2xl mb-12">
              {t('pricing_subtitle')}
            </p>
            <div className="grid md:grid-cols-3 gap-5">
              {TIERS_META.map((tier) => (
                <div
                  key={tier.id}
                  id={tier.id}
                  className={`card-enterprise flex flex-col relative ${tier.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
                >
                  {tier.popular && (
                    <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                      {t('popular_badge')}
                    </span>
                  )}
                  <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                  <p className="text-sm text-foreground/60 mb-5">{t(tier.descKey)}</p>
                  <div className="flex items-baseline gap-1 mb-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-sm text-foreground/50">{t('tier_period')}</span>
                  </div>
                  <p className="text-xs text-amber-400 font-mono uppercase tracking-wider mb-6">{t(tier.pfKey)}</p>
                  <ul className="space-y-2.5 mb-8 flex-1">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                        <Check className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={tier.id === 'hnwi' ? '/contact?subject=crypto-hnwi' : `/register/crypto?tier=${tier.id}`}
                    className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                      tier.popular
                        ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                        : 'border border-border hover:bg-accent hover:border-amber-500/40'
                    }`}
                  >
                    {t(tier.ctaKey)} <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
            <p className="text-xs text-foreground/50 mt-6 text-center">
              {t('pricing_footer')}
            </p>
          </div>
        </section>

        {/* Steps */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('steps_eyebrow')}</p>
            <h2 className="t-display-section mb-12 max-w-2xl">{t('steps_title')}</h2>
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

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="container-default px-4 sm:px-6">
            <p className="t-eyebrow mb-3">{t('faq_eyebrow')}</p>
            <h2 className="t-display-section mb-12 max-w-2xl">{t('faq_title')}</h2>
            <div className="grid md:grid-cols-2 gap-x-10 gap-y-8 max-w-5xl">
              {FAQ_ITEMS.map((item) => (
                <div key={item.q}>
                  <h3 className="text-base font-semibold mb-2 leading-snug">{item.q}</h3>
                  <p className="t-body-sm text-foreground/70 leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="container-default px-4 sm:px-6 text-center max-w-3xl mx-auto">
            <h2 className="t-display-section mb-4">{t('cta_title')}</h2>
            <p className="t-body text-foreground/60 mb-8">
              {t('cta_body')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register/crypto" className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 rounded-md text-sm font-medium">
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
      </main>
      <EnterpriseFooter />
    </div>
  );
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
