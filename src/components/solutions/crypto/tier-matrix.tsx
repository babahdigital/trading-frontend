import { Link } from '@/i18n/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { formatPrice, type Locale, type PriceKey } from '@/lib/pricing-format';
import type { CryptoTier } from '@/lib/trading/trading-settings';

const TIER_CTA_HREF: Record<string, string> = {
  demo: '/register?service=crypto&tier=demo',
  starter: '/register?service=crypto&tier=starter',
  active: '/register?service=crypto&tier=active',
  pro: '/register?service=crypto&tier=pro',
  hnwi: '/contact?subject=crypto-hnwi',
};

interface TierMatrixProps {
  t: (key: string) => string;
  tRaw: (key: string) => unknown;
  localeKey: Locale;
  tiers: CryptoTier[];
}

export function TierMatrix({ t, tRaw, localeKey, tiers }: TierMatrixProps) {
  const demoTier = tiers.find((tt) => tt.slug === 'demo');
  const paidTiers = tiers.filter((tt) => tt.slug !== 'demo');

  return (
    <section id="pricing" className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('pricing_eyebrow')}</p>
        <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{t('pricing_title')}</h2>
        <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
          {t('pricing_subtitle')}
        </p>

        {/* Demo Banner */}
        {demoTier && (() => {
          const bannerTitle = localeKey === 'en' ? 'Try Robot Crypto FREE for 30 days' : 'Coba Robot Crypto GRATIS 30 hari';
          const bannerSubtitle = localeKey === 'en'
            ? `Demo wallet $5,000 USDT · ${demoTier.slots} concurrent slot · ${demoTier.leverage}x leverage · Scalping Momentum · No credit card.`
            : `Demo wallet $5.000 USDT · ${demoTier.slots} posisi simultan · leverage ${demoTier.leverage}x · Scalping Momentum · Tanpa kartu kredit.`;
          return (
            <div id="demo" className="mb-8 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                      {demoTier.name}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono uppercase tracking-wider">
                      {localeKey === 'en' ? 'Zero Cost · No Commitment' : 'Tanpa Biaya · Tanpa Komitmen'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1">{bannerTitle}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{bannerSubtitle}</p>
                </div>
                <Link
                  href={TIER_CTA_HREF[demoTier.slug] ?? '/register?service=crypto&tier=demo'}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium shrink-0"
                >
                  {t(`tier_${demoTier.slug}_cta`)} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* Paid tier grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {paidTiers.map((tier) => {
            const features = tRaw(`tier_${tier.slug}_features`) as string[] | undefined;
            const priceKey = `crypto_${tier.slug}` as PriceKey;
            return (
              <div
                key={tier.slug}
                id={tier.slug}
                className={`card-enterprise flex flex-col relative ${tier.popular ? 'border-amber-500/50 ring-2 ring-amber-500/20' : ''}`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 left-6 inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                    {t('popular_badge')}
                  </span>
                )}
                <h3 className="text-xl font-semibold mb-1">{tier.name}</h3>
                <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-3">
                  {t(`tier_${tier.slug}_desc`).slice(0, 80)} · {tier.slots} slot · {tier.leverage}x
                </p>
                <p className="text-sm text-foreground/60 mb-4 leading-relaxed">{t(`tier_${tier.slug}_desc`)}</p>
                <div className="flex items-baseline gap-1 mb-1 flex-wrap">
                  <span className="text-3xl sm:text-4xl font-bold break-words">{formatPrice(priceKey, localeKey, { compact: false })}</span>
                  <span className="text-sm text-foreground/50">
                    {localeKey === 'id' ? '/bulan' : '/mo'}
                  </span>
                </div>
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider mb-5">
                  Risk {tier.risk_pct}%/trade
                </p>
                {features && (
                  <ul className="space-y-2 mb-6 flex-1">
                    {features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={TIER_CTA_HREF[tier.slug] ?? '/register?service=crypto'}
                  className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                    tier.popular
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                      : 'border border-border hover:bg-accent hover:border-amber-500/40'
                  }`}
                >
                  {t(`tier_${tier.slug}_cta`)} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-foreground/50 mt-6 text-center">
          {t('pricing_footer')}
        </p>
      </div>
    </section>
  );
}
