import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { ArrowRight, Server, Building2, TrendingUp, Info, Cpu, ShieldCheck, Activity, FileCheck, Zap, Wrench, Check } from 'lucide-react';
import { breadcrumbSchema, financialProductSchema, ldJson, organizationSchema } from '@/lib/seo-jsonld';
import { formatPrice, type Locale } from '@/lib/pricing-format';

export const dynamic = 'force-dynamic';

// 2-VPS architecture spec — Windows MT5 (broker connection) + Linux orchestrator
// (backend). Setiap tier punya pembagian responsibility yang berbeda, ditampilkan
// di responsibility matrix di bawah tabel.
const SPEC_META = [
  { specKey: 'spec_role', winKey: 'spec_role_windows', linuxKey: 'spec_role_linux' },
  { specKey: 'spec_os', winKey: 'spec_os_windows', linuxKey: 'spec_os_linux' },
  { specKey: 'spec_cpu', winKey: 'spec_cpu_windows', linuxKey: 'spec_cpu_linux' },
  { specKey: 'spec_ram', winKey: 'spec_ram_windows', linuxKey: 'spec_ram_linux' },
  { specKey: 'spec_storage', winKey: 'spec_storage_windows', linuxKey: 'spec_storage_linux' },
  { specKey: 'spec_network', winKey: 'spec_network_windows', linuxKey: 'spec_network_linux' },
  { specKey: 'spec_uptime', winKey: 'spec_uptime_windows', linuxKey: 'spec_uptime_linux' },
  { specKey: 'spec_monitoring', winKey: 'spec_monitoring_windows', linuxKey: 'spec_monitoring_linux' },
  { specKey: 'spec_backup', winKey: 'spec_backup_windows', linuxKey: 'spec_backup_linux' },
] as const;

// Responsibility matrix per tier — Yang sediakan apa di tiap tier
const RESPONSIBILITY_META = [
  { tierKey: 'matrix_t1_tier', winKey: 'matrix_t1_windows', linuxKey: 'matrix_t1_linux', tone: 'neutral' as const },
  { tierKey: 'matrix_t2_tier', winKey: 'matrix_t2_windows', linuxKey: 'matrix_t2_linux', tone: 'highlight' as const },
  { tierKey: 'matrix_t3_tier', winKey: 'matrix_t3_windows', linuxKey: 'matrix_t3_linux', tone: 'turnkey' as const },
] as const;

const FEATURE_META = [
  { titleKey: 'feat1_title', descKey: 'feat1_desc', icon: Server },
  { titleKey: 'feat2_title', descKey: 'feat2_desc', icon: Wrench },
  { titleKey: 'feat3_title', descKey: 'feat3_desc', icon: Zap },
  { titleKey: 'feat4_title', descKey: 'feat4_desc', icon: ShieldCheck },
  { titleKey: 'feat5_title', descKey: 'feat5_desc', icon: FileCheck },
  { titleKey: 'feat6_title', descKey: 'feat6_desc', icon: Activity },
] as const;

type TierMeta = {
  key: string;
  icon: typeof Cpu;
  accent: 'amber' | 'sky' | 'emerald';
  popular?: boolean;
  setupKey: string;
  monthlyKey: string;
  nameKey: string;
  taglineKey: string;
  totalKey: string;
  popularKey?: string;
  youKey: string;
  usKey: string;
  bestKey: string;
};

const TIER_META: TierMeta[] = [
  {
    key: 'tier1',
    icon: Cpu,
    accent: 'amber',
    setupKey: 'tier1_setup_value',
    monthlyKey: 'tier1_monthly_value',
    nameKey: 'tier1_name',
    taglineKey: 'tier1_tagline',
    totalKey: 'tier1_total_year1',
    youKey: 'tier1_what_you_provide',
    usKey: 'tier1_what_we_provide',
    bestKey: 'tier1_best_for',
  },
  {
    key: 'tier2',
    icon: Server,
    accent: 'sky',
    popular: true,
    setupKey: 'tier2_setup_value',
    monthlyKey: 'tier2_monthly_value',
    nameKey: 'tier2_name',
    taglineKey: 'tier2_tagline',
    totalKey: 'tier2_total_year1',
    popularKey: 'tier2_popular',
    youKey: 'tier2_what_you_provide',
    usKey: 'tier2_what_we_provide',
    bestKey: 'tier2_best_for',
  },
  {
    key: 'tier3',
    icon: Building2,
    accent: 'emerald',
    setupKey: 'tier3_setup_value',
    monthlyKey: 'tier3_monthly_value',
    nameKey: 'tier3_name',
    taglineKey: 'tier3_tagline',
    totalKey: 'tier3_total_year1',
    youKey: 'tier3_what_you_provide',
    usKey: 'tier3_what_we_provide',
    bestKey: 'tier3_best_for',
  },
];

const STEP_META = [
  { step: '01', titleKey: 'step1_title', descKey: 'step1_desc' },
  { step: '02', titleKey: 'step2_title', descKey: 'step2_desc' },
  { step: '03', titleKey: 'step3_title', descKey: 'step3_desc' },
  { step: '04', titleKey: 'step4_title', descKey: 'step4_desc' },
  { step: '05', titleKey: 'step5_title', descKey: 'step5_desc' },
] as const;

const FAQ_META = [
  { qKey: 'faq1_q', aKey: 'faq1_a' },
  { qKey: 'faq2_q', aKey: 'faq2_a' },
  { qKey: 'faq3_q', aKey: 'faq3_a' },
  { qKey: 'faq4_q', aKey: 'faq4_a' },
  { qKey: 'faq5_q', aKey: 'faq5_a' },
] as const;

const ELIG_KEYS = ['elig_b1', 'elig_b2', 'elig_b3'] as const;

/**
 * Responsibility badge — colored chip yang highlight "Anda sediakan" vs
 * "BabahAlgo provision". Visual cue cepat untuk distinguish keduanya.
 */
function ResponsibilityBadge({ value }: { value: string }) {
  // Auto-detect provider dari string content (locale-aware: ID + EN)
  const isBabahAlgo = /babahalgo provision|babahalgo|kami sediakan/i.test(value);
  const colorClass = isBabahAlgo
    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
    : 'bg-amber-500/15 border-amber-500/40 text-amber-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md border text-xs font-medium ${colorClass}`}>
      {value}
    </span>
  );
}

export default async function LicensePage() {
  const t = await getTranslations('solutions_license');
  const breadcrumb = breadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: 'Solutions', url: '/solutions' },
    { name: 'VPS License', url: '/solutions/license' },
  ]);
  const tiers = [
    { name: 'VPS Standard — $3,000 setup + $150/mo', description: 'Dedicated VPS broker-level, full bot access, custom configuration', price: '3000', currency: 'USD' },
    { name: 'VPS Premium — $7,500 setup + $300/mo', description: 'Multi-broker bridge MT4+MT5, 3 akun paralel, priority support 24/7', price: '7500', currency: 'USD' },
    { name: 'VPS Dedicated — $1,499/mo', description: 'Single-customer isolated VPS, dedicated MT5 bridge, 24/7 incident channel, SLA 99.9%', price: '1499', currency: 'USD' },
  ].map((m) => financialProductSchema({ ...m, url: '/solutions/license' }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(organizationSchema()) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumb) }} />
      {tiers.map((schema, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(schema) }} />
      ))}
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />
      <main id="main-content">
        {/* Hero — dengan tier badge yang langsung kelihatan untuk differentiate
            dari /solutions/institutional. Plus info card "beda dari institutional?"
            di bawah subtitle supaya user tidak bingung antara 2 produk. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-4">{t('hero_eyebrow')}</p>

            {/* Tier identifier badge — visual cue ini retail product, bukan B2B */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 mb-5">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-amber-300">
                {t('hero_tier_badge')}
              </span>
            </div>

            <h1 className="t-display-page mb-6 max-w-4xl">
              {t('hero_title')}
            </h1>
            <p className="t-lead text-foreground/60 max-w-3xl mb-8">
              {t('hero_subtitle')}
            </p>

            {/* Differentiation hint — link ke comparison section bottom */}
            <div className="inline-flex items-start gap-3 p-4 rounded-lg border border-border/60 bg-muted/30 max-w-2xl">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1">{t('hero_diff_label')}</p>
                <p className="text-xs text-foreground/60 leading-relaxed">{t('hero_diff_body')}</p>
              </div>
            </div>
          </div>
        </section>

        {/* 2-VPS Architecture Spec — dual-column table (Windows MT5 vs
            Linux Orchestrator). Plus responsibility matrix di bawahnya supaya
            user clear siapa provision apa per tier.

            Refactor 2026-05-15: tabel lama hanya 1 VPS spec (4 vCPU, 8GB)
            tidak akurat untuk 3-tier baru yang pakai 2 VPS. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="mb-8 sm:mb-10 max-w-3xl">
              <p className="t-eyebrow mb-3">{t('infra_eyebrow')}</p>
              <h2 className="t-display-sub mb-4">{t('infra_title')}</h2>
              <p className="t-body text-foreground/60 leading-relaxed">
                {t('infra_subtitle')}
              </p>
            </div>

            {/* Dual-VPS spec table — responsive: stacked di mobile, table di desktop */}
            <div className="max-w-5xl mb-10 sm:mb-12">
              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left px-3 sm:px-5 py-3 font-semibold text-xs uppercase tracking-wider text-foreground/60 w-1/4">
                        {t('col_component')}
                      </th>
                      <th className="text-left px-3 sm:px-5 py-3 font-semibold text-xs uppercase tracking-wider w-[37.5%]">
                        <span className="text-amber-400">{t('col_vps_windows')}</span>
                      </th>
                      <th className="text-left px-3 sm:px-5 py-3 font-semibold text-xs uppercase tracking-wider w-[37.5%]">
                        <span className="text-sky-400">{t('col_vps_linux')}</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {SPEC_META.map((row) => (
                      <tr key={row.specKey} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-3 sm:px-5 py-3 font-medium text-foreground/80 align-top">
                          {t(row.specKey)}
                        </td>
                        <td className="px-3 sm:px-5 py-3 font-mono text-xs sm:text-sm text-amber-300 align-top">
                          {t(row.winKey)}
                        </td>
                        <td className="px-3 sm:px-5 py-3 font-mono text-xs sm:text-sm text-sky-300 align-top">
                          {t(row.linuxKey)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Responsibility matrix — siapa provision apa per tier */}
            <div className="max-w-5xl">
              <div className="mb-6">
                <p className="t-eyebrow mb-3">{t('matrix_eyebrow')}</p>
                <h3 className="font-display text-xl sm:text-2xl font-medium mb-3">{t('matrix_title')}</h3>
                <p className="t-body-sm text-foreground/60 leading-relaxed max-w-3xl">
                  {t('matrix_subtitle')}
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/30">
                      <th className="text-left px-3 sm:px-5 py-3 font-semibold text-xs uppercase tracking-wider text-foreground/60">
                        {t('matrix_col_tier')}
                      </th>
                      <th className="text-left px-3 sm:px-5 py-3 font-semibold text-xs uppercase tracking-wider text-amber-400">
                        {t('matrix_col_windows')}
                      </th>
                      <th className="text-left px-3 sm:px-5 py-3 font-semibold text-xs uppercase tracking-wider text-sky-400">
                        {t('matrix_col_linux')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {RESPONSIBILITY_META.map((row) => (
                      <tr key={row.tierKey} className="border-b border-border/40 last:border-0 hover:bg-muted/10 transition-colors">
                        <td className="px-3 sm:px-5 py-3 font-medium text-foreground/80 align-top">
                          {t(row.tierKey)}
                        </td>
                        <td className="px-3 sm:px-5 py-3 align-top">
                          <ResponsibilityBadge
                            value={t(row.winKey)}
                          />
                        </td>
                        <td className="px-3 sm:px-5 py-3 align-top">
                          <ResponsibilityBadge
                            value={t(row.linuxKey)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Tip note — broker biasanya kasih VPS Windows gratis */}
              <div className="mt-5 p-4 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20 flex items-start gap-3">
                <span className="text-emerald-400 mt-0.5">💡</span>
                <p className="text-xs sm:text-sm text-foreground/70 leading-relaxed flex-1">
                  {t('matrix_note')}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Who it's for */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-4">{t('elig_eyebrow')}</p>
            <h2 className="t-display-sub mb-8">{t('elig_title')}</h2>
            <ul className="space-y-4 text-foreground/60 max-w-2xl">
              {ELIG_KEYS.map((k) => (
                <li key={k} className="flex items-start gap-3">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  <span>{t(k)}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Features — clean 2x3 icon grid. Sebelumnya alternating left-right
            dengan large aspect-[4/3] image placeholder yang user keluhan
            "terlalu besar, tidak baik di pandang". Sekarang compact card grid
            dengan icon Lucide untuk visual variety tanpa noise. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-4">{t('cap_eyebrow')}</p>
            <h2 className="t-display-sub mb-8 sm:mb-12 max-w-3xl">{t('cap_title')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {FEATURE_META.map((feature, i) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.titleKey} className="card-enterprise flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="inline-flex h-10 w-10 rounded-lg bg-amber-500/15 border border-amber-500/30 items-center justify-center shrink-0">
                        <Icon className="h-5 w-5 text-amber-400" />
                      </span>
                      <span className="font-mono text-xs text-foreground/40">{String(i + 1).padStart(2, '0')}</span>
                    </div>
                    <h3 className="font-display text-lg font-medium mb-2">{t(feature.titleKey)}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{t(feature.descKey)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing — 3-tier card grid mapping ke 3 model arsitektur:
            License Only / Hybrid / Full Turnkey. Setiap card menampilkan
            "Anda sediakan apa" vs "Kami sediakan apa" supaya klien jelas
            scope responsibility-nya. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="mb-10 sm:mb-12 max-w-3xl">
              <p className="t-eyebrow mb-4">{t('pricing_eyebrow')}</p>
              <h2 className="t-display-sub mb-4">{t('pricing_title')}</h2>
              <p className="text-foreground/60 leading-relaxed">{t('pricing_subtitle')}</p>
            </div>

            {/* 3-tier grid — responsive 1/3 col. Setiap card: header, harga,
                pembagian Anda/Kami sediakan, best-for, year-1 total */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              {TIER_META.map((tier) => {
                const Icon = tier.icon;
                const accentRing = tier.popular
                  ? 'border-2 border-sky-500/60 ring-1 ring-sky-500/30'
                  : 'border border-border/60';
                const accentText = tier.accent === 'amber' ? 'text-amber-400' : tier.accent === 'sky' ? 'text-sky-400' : 'text-emerald-400';
                const accentBg = tier.accent === 'amber' ? 'bg-amber-500/15 border-amber-500/30' : tier.accent === 'sky' ? 'bg-sky-500/15 border-sky-500/30' : 'bg-emerald-500/15 border-emerald-500/30';
                return (
                  <div
                    key={tier.key}
                    className={`rounded-xl ${accentRing} bg-card p-6 sm:p-7 flex flex-col h-full relative`}
                  >
                    {tier.popular && tier.popularKey && (
                      <span className="absolute -top-3 left-6 inline-flex items-center px-2.5 py-0.5 rounded-full bg-sky-500 text-white text-[10px] font-bold uppercase tracking-wider">
                        {t(tier.popularKey as 'tier2_popular')}
                      </span>
                    )}
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex h-10 w-10 rounded-lg ${accentBg} border items-center justify-center shrink-0`}>
                        <Icon className={`h-5 w-5 ${accentText}`} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display text-lg font-medium">{t(tier.nameKey)}</h3>
                        <p className="text-xs text-foreground/60 mt-0.5">{t(tier.taglineKey)}</p>
                      </div>
                    </div>

                    {/* Pricing block */}
                    <div className="mb-5 pb-5 border-b border-border/40">
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <span className="text-xs font-mono uppercase tracking-wider text-foreground/50">{t('tier_label_setup')}</span>
                        <span className="font-mono font-semibold text-sm sm:text-base">{t(tier.setupKey)}</span>
                      </div>
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-mono uppercase tracking-wider text-foreground/50">{t('tier_label_monthly')}</span>
                        <span className={`font-mono font-semibold text-sm sm:text-base ${accentText}`}>{t(tier.monthlyKey)}</span>
                      </div>
                    </div>

                    {/* Who provides what */}
                    <div className="space-y-3 mb-5 flex-1">
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mb-1.5">{t('tier_label_provide_you')}</p>
                        <p className="text-xs text-foreground/70 leading-relaxed">{t(tier.youKey)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mb-1.5">{t('tier_label_provide_us')}</p>
                        <p className="text-xs text-foreground/70 leading-relaxed">{t(tier.usKey)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-mono uppercase tracking-wider text-foreground/40 mb-1.5">{t('tier_label_best_for')}</p>
                        <p className="text-xs text-foreground/70 leading-relaxed">{t(tier.bestKey)}</p>
                      </div>
                    </div>

                    {/* Year-1 total footer */}
                    <div className="pt-3 border-t border-border/40">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-foreground/40">{t('tier_label_total')}</span>
                        <span className={`font-mono text-xs sm:text-sm font-semibold ${accentText}`}>{t(tier.totalKey)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Onboarding */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <p className="t-eyebrow mb-4">{t('process_eyebrow')}</p>
            <h2 className="t-display-sub mb-8 sm:mb-12">{t('process_title')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-6 sm:gap-y-8">
              {STEP_META.map((step, i) => (
                <div key={step.step} className="relative">
                  <p className="font-mono text-4xl sm:text-5xl text-amber-500/20 mb-3">{step.step}</p>
                  <h3 className="font-semibold text-sm mb-2">{t(step.titleKey)}</h3>
                  <p className="text-xs text-foreground/60 leading-relaxed">{t(step.descKey)}</p>
                  {i < STEP_META.length - 1 && (
                    <ArrowRight className="hidden md:block absolute top-4 -right-4 w-4 h-4 text-foreground/30" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="grid lg:grid-cols-5 gap-y-8 lg:gap-y-12 lg:gap-x-12">
              <div className="lg:col-span-2">
                <p className="t-eyebrow mb-4">{t('faq_eyebrow')}</p>
                <h2 className="t-display-sub">{t('faq_title')}</h2>
              </div>
              <div className="lg:col-span-3 space-y-6 sm:space-y-8">
                {FAQ_META.map((item) => (
                  <div key={item.qKey}>
                    <h3 className="font-semibold mb-2">{t(item.qKey)}</h3>
                    <p className="t-body-sm text-foreground/60 leading-relaxed">{t(item.aKey)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Side-by-side comparison block — VPS License vs Institutional vs
            Robot Meta retail. Membantu user pilih produk yang tepat sesuai
            modal mereka. Kalau salah pintu masuk, ini decision tree-nya. */}
        <section className="section-padding border-b border-border/60">
          <div className="layout-container">
            <div className="mb-8 sm:mb-10 max-w-3xl">
              <p className="t-eyebrow mb-4">{t('compare_eyebrow')}</p>
              <h2 className="t-display-sub">{t('compare_title')}</h2>
            </div>

            {/* 2-col comparison: this page vs institutional */}
            <div className="grid lg:grid-cols-2 gap-5 mb-6">
              {/* VPS License card — current page indicator */}
              <div className="rounded-xl border-2 border-amber-500/50 bg-amber-500/[0.04] p-6 sm:p-7">
                <div className="flex items-center gap-3 mb-4">
                  <Server className="w-6 h-6 text-amber-400" />
                  <h3 className="font-semibold text-lg">{t('compare_license_title')}</h3>
                  <span className="ml-auto text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    HALAMAN INI
                  </span>
                </div>
                <ul className="space-y-2.5 text-sm">
                  <li className="flex gap-2 items-start">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_license_for')}</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_license_modal')}</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_license_cost')}</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-amber-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_license_what')}</span>
                  </li>
                </ul>
              </div>

              {/* Institutional card — link untuk upgrade */}
              <div className="rounded-xl border border-border/60 bg-card p-6 sm:p-7 hover:border-sky-500/40 transition-colors">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="w-6 h-6 text-sky-400" />
                  <h3 className="font-semibold text-lg">{t('compare_inst_title')}</h3>
                </div>
                <ul className="space-y-2.5 text-sm mb-5">
                  <li className="flex gap-2 items-start">
                    <span className="text-sky-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_inst_for')}</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-sky-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_inst_modal')}</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-sky-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_inst_cost')}</span>
                  </li>
                  <li className="flex gap-2 items-start">
                    <span className="text-sky-400 mt-0.5">→</span>
                    <span className="text-foreground/80">{t('compare_inst_what')}</span>
                  </li>
                </ul>
                <Link
                  href="/solutions/institutional"
                  className="inline-flex items-center gap-2 text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
                >
                  {t('compare_inst_cta')} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Retail tier callout — downgrade option untuk user dengan modal kecil */}
            <div className="rounded-lg border border-border/60 bg-muted/20 p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
              <TrendingUp className="w-5 h-5 text-foreground/50 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold mb-1">{t('compare_under_label')}</p>
                <p className="text-xs text-foreground/60 leading-relaxed mb-2">{t('compare_under_body')}</p>
                <Link
                  href="/solutions/signal"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-amber-400 transition-colors"
                >
                  {t('compare_under_cta')} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="section-padding">
          <div className="layout-container text-center">
            <p className="t-eyebrow mb-4">{t('cta_eyebrow')}</p>
            <h2 className="t-display-sub mb-4">{t('cta_title')}</h2>
            <p className="text-foreground/60 mb-8 max-w-lg mx-auto">
              {t('cta_body')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register?service=vps"
                className="btn-primary inline-flex items-center gap-2"
              >
                {t('cta_register')}
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/contact"
                className="btn-secondary inline-flex items-center gap-2"
              >
                {t('cta_button')}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>
      <EnterpriseFooter />
    </div>
    </>
  );
}
