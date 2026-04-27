'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Check, ChevronRight, TrendingUp, Coins, Server, Bitcoin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
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
  pamm: Coins,
  'pamm-basic': Coins,
  'pamm-pro': Coins,
  vps: Server,
  'vps-license': Server,
  crypto: Bitcoin,
  'crypto-basic': Bitcoin,
  'crypto-pro': Bitcoin,
  'crypto-hnwi': Bitcoin,
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
    {
      slug: 'pamm', name: t('tier_pamm_name'), price: tFallback('pamm_price'), subtitle: t('tier_pamm_desc'),
      features: [
        tFallback('pamm_feature_1'),
        tFallback('pamm_feature_2'),
        tFallback('pamm_feature_3'),
        tFallback('pamm_feature_4'),
      ],
      note: null, ctaLabel: t('select_package'), ctaLink: '/register/pamm',
    },
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
  ];

  const displayPkgs = packages.length > 0 ? packages : FALLBACK_PACKAGES;

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo/babahalgo-header-dark.png"
              alt="BabahAlgo"
              width={130}
              height={26}
              className="h-6 sm:h-7 w-auto hidden dark:block"
              priority
            />
            <Image
              src="/logo/babahalgo-header-light.png"
              alt="BabahAlgo"
              width={130}
              height={26}
              className="h-6 sm:h-7 w-auto dark:hidden"
              priority
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <Link
              href="/login"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg border border-white/15 text-xs sm:text-sm font-medium hover:bg-accent hover:border-amber-500/30 transition-colors"
            >
              {t('have_account')}
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
        <div className="text-center mb-10 sm:mb-14 max-w-3xl mx-auto">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4 leading-tight">
            {t('title')}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            {t('subtitle')}
          </p>
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
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h2 className="font-bold text-lg leading-tight">{pkg.name}</h2>
                  </div>

                  {pkg.subtitle && (
                    <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{pkg.subtitle}</p>
                  )}

                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t('starts_from')}</div>
                  <div className="text-xl sm:text-2xl font-bold font-mono mb-5 text-amber-300">{pkg.price}</div>

                  <ul className="flex-1 space-y-2.5 mb-6">
                    {features.map((f, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                        <span className="text-foreground/80">{String(f)}</span>
                      </li>
                    ))}
                  </ul>

                  {pkg.note && (
                    <p className="text-[11px] text-muted-foreground/70 mb-4 leading-relaxed">* {pkg.note}</p>
                  )}

                  <Link
                    href={pkg.ctaLink}
                    className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 active:scale-[0.98] transition-all group-hover:gap-3"
                  >
                    {pkg.ctaLabel}
                    <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          {t('have_account')}{' '}
          <Link href="/login" className="text-amber-400 hover:underline font-medium">
            {t('sign_in_link')}
          </Link>
        </div>
      </div>
    </div>
  );
}
