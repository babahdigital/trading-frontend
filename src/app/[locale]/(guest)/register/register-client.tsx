'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight, TrendingUp, Server, Bitcoin, Sparkles, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EnterpriseNav } from '@/components/layout/enterprise-nav';
import { EnterpriseFooter } from '@/components/layout/enterprise-footer';
import { cn } from '@/lib/utils';

interface PackageData {
  slug: string;
  name: string;
  price: string;
  subtitle: string | null;
  features: unknown;
  note: string | null;
  ctaLabel: string;
  ctaLink: string;
}

const ICON_BY_SLUG: Record<string, typeof TrendingUp> = {
  signal: TrendingUp,
  'signal-basic': TrendingUp,
  'signal-vip': TrendingUp,
  // PAMM dihentikan 2026-04-26 — slug masih dipetakan sebagai fallback agar
  // CMS tier lama tidak crash sebelum admin migrasi nama. Sekarang me-resolve
  // ke ikon Server (sering disandingkan dengan VPS license).
  pamm: Server,
  vps: Server,
  'vps-license': Server,
  crypto: Bitcoin,
  'crypto-basic': Bitcoin,
  'crypto-pro': Bitcoin,
  'crypto-hnwi': Bitcoin,
  institutional: Sparkles,
  'institutional-api': Sparkles,
};

function pickIcon(slug: string) {
  const normalized = slug.toLowerCase();
  for (const [key, Icon] of Object.entries(ICON_BY_SLUG)) {
    if (normalized.includes(key)) return Icon;
  }
  return TrendingUp;
}

export function RegisterClient({ packages }: { packages: PackageData[] }) {
  const t = useTranslations('register');
  const tFallback = useTranslations('register.fallback_packages');

  // Local fallback uses translations for resilience when DB empty.
  const FALLBACK_PACKAGES: PackageData[] = [
    {
      slug: 'signal', name: t('tier_signal_name'), price: tFallback('signal_price'), subtitle: t('tier_signal_desc'),
      features: [
        tFallback('signal_feature_1'),
        tFallback('signal_feature_2'),
        tFallback('signal_feature_3'),
        tFallback('signal_feature_4'),
      ],
      note: null, ctaLabel: t('select_package'), ctaLink: '/register/signal',
    },
    // PAMM tier dihentikan 2026-04-26. Customer sekarang trade di akun broker
    // sendiri (Robot Meta tier). Slot ini sengaja dihilangkan agar Crypto Bot
    // dan VPS License lebih menonjol.
    {
      slug: 'vps', name: t('tier_vps_name'), price: tFallback('vps_price'), subtitle: t('tier_vps_desc'),
      features: [
        tFallback('vps_feature_1'),
        tFallback('vps_feature_2'),
        tFallback('vps_feature_3'),
        tFallback('vps_feature_4'),
      ],
      note: tFallback('vps_note'), ctaLabel: t('select_package'), ctaLink: '/register/vps',
    },
    {
      slug: 'crypto', name: t('tier_crypto_name'), price: tFallback('crypto_price'), subtitle: t('tier_crypto_desc'),
      features: [
        tFallback('crypto_feature_1'),
        tFallback('crypto_feature_2'),
        tFallback('crypto_feature_3'),
        tFallback('crypto_feature_4'),
      ],
      note: tFallback('crypto_note'), ctaLabel: t('select_package'), ctaLink: '/register/crypto',
    },
    {
      slug: 'institutional', name: t('tier_institutional_name'), price: tFallback('institutional_price'), subtitle: t('tier_institutional_desc'),
      features: [
        tFallback('institutional_feature_1'),
        tFallback('institutional_feature_2'),
        tFallback('institutional_feature_3'),
        tFallback('institutional_feature_4'),
      ],
      note: tFallback('institutional_note'), ctaLabel: t('contact_us'), ctaLink: '/register/institutional',
    },
  ];

  const displayPkgs = packages.length > 0 ? packages : FALLBACK_PACKAGES;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <EnterpriseNav />

      <main id="main-content">
        {/* Hero — institutional unified entry */}
        <section className="section-padding border-b border-border/60 page-stamp-editorial">
          <div className="container-default text-center max-w-3xl mx-auto">
            <p className="t-eyebrow mb-4 inline-flex items-center gap-2">
              <Shield className="h-3.5 w-3.5 text-amber-400" strokeWidth={2.25} aria-hidden />
              {t('hero_eyebrow')}
            </p>
            <h1 className="t-display-page mb-5 leading-tight">{t('title')}</h1>
            <p className="t-body text-muted-foreground leading-relaxed mb-2">{t('subtitle')}</p>
            <p className="text-xs text-foreground/50 italic max-w-2xl mx-auto">{t('zero_custody_note')}</p>
          </div>
        </section>

        {/* Package grid — unified product selector */}
        <section className="section-padding">
          <div className="container-default">
            <div className="flex flex-wrap items-baseline justify-between gap-3 mb-6">
              <h2 className="t-eyebrow">{t('packages_eyebrow')}</h2>
              <Link href="/pricing" className="btn-tertiary text-sm">
                {t('compare_all')} <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
              {displayPkgs.map((pkg) => {
                const features = Array.isArray(pkg.features) ? (pkg.features as string[]) : [];
                const Icon = pickIcon(pkg.slug);
                return (
                  <Card
                    key={pkg.slug}
                    className={cn(
                      'flex flex-col group transition-all duration-200',
                      'hover:border-amber-500/40 hover:shadow-lg hover:-translate-y-0.5',
                    )}
                  >
                    <CardContent className="p-5 sm:p-6 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-500 dark:text-amber-400 shrink-0">
                          <Icon className="h-5 w-5" strokeWidth={2} />
                        </span>
                        <h3 className="font-display text-xl leading-tight">{pkg.name}</h3>
                      </div>

                      {pkg.subtitle && (
                        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{pkg.subtitle}</p>
                      )}

                      <div className="t-eyebrow text-muted-foreground mb-1">{t('starts_from')}</div>
                      <div className="text-xl sm:text-2xl font-mono font-semibold mb-5 text-amber-600 dark:text-amber-300">{pkg.price}</div>

                      <ul className="flex-1 space-y-2.5 mb-6">
                        {features.map((f, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <Check className="h-4 w-4 text-[hsl(var(--profit))] shrink-0 mt-0.5" strokeWidth={2.25} />
                            <span className="text-foreground/80">{String(f)}</span>
                          </li>
                        ))}
                      </ul>

                      {pkg.note && (
                        <p className="text-[11px] text-muted-foreground/70 mb-4 leading-relaxed">* {pkg.note}</p>
                      )}

                      <Link
                        href={pkg.ctaLink}
                        className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all group-hover:gap-3"
                      >
                        {pkg.ctaLabel}
                        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2.25} />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Footer reassurance + signin */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              <div className="rounded-md border border-border/70 bg-card/50 p-4 text-sm">
                <p className="font-medium text-foreground mb-1">{t('demo_first_title')}</p>
                <p className="text-muted-foreground text-xs leading-relaxed mb-2">{t('demo_first_body')}</p>
                <Link href="/demo" className="btn-tertiary text-xs">
                  {t('demo_first_cta')} <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
                </Link>
              </div>
              <div className="rounded-md border border-border/70 bg-card/50 p-4 text-sm">
                <p className="font-medium text-foreground mb-1">{t('signin_title')}</p>
                <p className="text-muted-foreground text-xs leading-relaxed mb-2">{t('signin_body')}</p>
                <Link href="/login" className="btn-tertiary text-xs">
                  {t('sign_in_link')} <ChevronRight className="h-3 w-3" strokeWidth={2.25} />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <EnterpriseFooter />
    </div>
  );
}
