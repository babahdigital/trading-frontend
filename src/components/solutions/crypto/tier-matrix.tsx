import { Link } from '@/i18n/navigation';
import { ArrowRight, Check } from 'lucide-react';
import { formatPrice, type Locale, type PriceKey } from '@/lib/pricing-format';

interface CryptoTierMeta {
  id: 'demo' | 'starter' | 'active' | 'pro' | 'hnwi';
  name: { id: string; en: string };
  priceKey: PriceKey;
  popular?: boolean;
  modalMin: { id: string; en: string };
  slot: number;
  leverage: string;
  riskPerTrade: string;
  notionalCap: string;
  cta: { id: string; en: string };
  ctaHref: string;
  desc: { id: string; en: string };
  features: { id: string[]; en: string[] };
}

const CRYPTO_TIERS_META: CryptoTierMeta[] = [
  {
    id: 'demo',
    name: { id: 'Demo Free', en: 'Demo Free' },
    priceKey: 'crypto_demo',
    modalMin: { id: 'Demo wallet $5.000', en: 'Demo wallet $5,000' },
    slot: 1,
    leverage: '2x',
    riskPerTrade: '0.5%',
    notionalCap: '30%',
    cta: { id: 'Mulai Trial 30 Hari', en: 'Start 30-day Trial' },
    ctaHref: '/register?service=crypto&tier=demo',
    desc: {
      id: 'Eksplor strategi tanpa risiko modal. Demo wallet $5K USDT, 1 posisi simultan, leverage 2x maks. Tanpa kartu kredit.',
      en: 'Explore strategies risk-free. $5K USDT demo wallet, 1 concurrent slot, max 2x leverage. No credit card required.',
    },
    features: {
      id: [
        'Demo wallet $5.000 USDT mock realistis',
        '1 posisi simultan · leverage 2x maks',
        'Strategi: Spot DCA Trend (konservatif)',
        'Risk per trade 0.5% · notional cap 30%',
        'Telegram alert sinyal real-time',
        'Auto-stop hari ke-30 (no auto-charge)',
      ],
      en: [
        '$5,000 USDT realistic mock demo wallet',
        '1 concurrent slot · max 2x leverage',
        'Strategy: Spot DCA Trend (conservative)',
        '0.5% risk per trade · 30% notional cap',
        'Real-time Telegram signal alerts',
        'Auto-stop on day 30 (no auto-charge)',
      ],
    },
  },
  {
    id: 'starter',
    name: { id: 'Starter', en: 'Starter' },
    priceKey: 'crypto_starter',
    modalMin: { id: 'Modal ≥ $500', en: 'Capital ≥ $500' },
    slot: 2,
    leverage: '3x',
    riskPerTrade: '1.0%',
    notionalCap: '40%',
    cta: { id: 'Mulai Starter', en: 'Start Starter' },
    ctaHref: '/register?service=crypto&tier=starter',
    desc: {
      id: 'Entry tier untuk live trading konservatif. 2 posisi simultan, leverage 3x. Sweet spot di modal $1K-1.5K.',
      en: 'Entry tier for conservative live trading. 2 concurrent slots, 3x leverage. Sweet spot at $1K-1.5K capital.',
    },
    features: {
      id: [
        '2 posisi simultan · leverage 3x maks',
        'Strategi: Spot DCA Trend',
        'Risk per trade 1.0% · notional cap 40%',
        'Kill-switch otomatis (daily loss cap)',
        'Multi-stage cooldown',
        'Email + Telegram notification',
      ],
      en: [
        '2 concurrent slots · max 3x leverage',
        'Strategy: Spot DCA Trend',
        '1.0% risk per trade · 40% notional cap',
        'Automatic kill-switch (daily loss cap)',
        'Multi-stage cooldown',
        'Email + Telegram notifications',
      ],
    },
  },
  {
    id: 'active',
    name: { id: 'Active', en: 'Active' },
    priceKey: 'crypto_active',
    modalMin: { id: 'Modal ≥ $1.500', en: 'Capital ≥ $1,500' },
    slot: 3,
    leverage: '7x',
    riskPerTrade: '1.25%',
    notionalCap: '55%',
    cta: { id: 'Mulai Active', en: 'Start Active' },
    ctaHref: '/register?service=crypto&tier=active',
    desc: {
      id: 'Trader aktif dengan diversifikasi 2 strategi (DCA + Swing). 3 posisi simultan, leverage 7x. Sweet spot $2.5K.',
      en: 'Active trader with 2-strategy diversification (DCA + Swing). 3 concurrent slots, 7x leverage. Sweet spot $2.5K.',
    },
    features: {
      id: [
        '3 posisi simultan · leverage 7x maks',
        'Strategi: Spot DCA + Spot Swing Trend',
        'Risk per trade 1.25% · notional cap 55%',
        'Multi-stage kill-switch + cooldown',
        '6-layer exit engine',
        'Audit trail + position reconciliation',
      ],
      en: [
        '3 concurrent slots · max 7x leverage',
        'Strategies: Spot DCA + Spot Swing Trend',
        '1.25% risk per trade · 55% notional cap',
        'Multi-stage kill-switch + cooldown',
        '6-layer exit engine',
        'Audit trail + position reconciliation',
      ],
    },
  },
  {
    id: 'pro',
    name: { id: 'Pro', en: 'Pro' },
    priceKey: 'crypto_pro',
    popular: true,
    modalMin: { id: 'Modal ≥ $5.000', en: 'Capital ≥ $5,000' },
    slot: 5,
    leverage: '12x',
    riskPerTrade: '1.5%',
    notionalCap: '60%',
    cta: { id: 'Mulai Pro', en: 'Start Pro' },
    ctaHref: '/register?service=crypto&tier=pro',
    desc: {
      id: 'Trader serius dengan akses penuh ke 3 strategi (Smart Money + Spot DCA + Spot Swing). 5 posisi simultan, leverage 12x. Sweet spot $10K (fee hanya 0.5% dari profit).',
      en: 'Serious trader with full access to 3 strategies (Smart Money + Spot DCA + Spot Swing). 5 concurrent slots, 12x leverage. Sweet spot $10K (fee just 0.5% of profit).',
    },
    features: {
      id: [
        '5 posisi simultan · leverage 12x maks',
        'Semua strategi: Smart Money + Spot DCA + Spot Swing',
        'Risk per trade 1.5% · notional cap 60%',
        'Full reconciliation engine',
        'Priority signal queue (low-latency)',
        'Audit trail + custom risk profile',
      ],
      en: [
        '5 concurrent slots · max 12x leverage',
        'All strategies: Smart Money + Spot DCA + Spot Swing',
        '1.5% risk per trade · 60% notional cap',
        'Full reconciliation engine',
        'Priority signal queue (low-latency)',
        'Audit trail + custom risk profile',
      ],
    },
  },
  {
    id: 'hnwi',
    name: { id: 'HNWI', en: 'HNWI' },
    priceKey: 'crypto_hnwi',
    modalMin: { id: 'Modal ≥ $25.000', en: 'Capital ≥ $25,000' },
    slot: 7,
    leverage: '20x',
    riskPerTrade: '2.0%',
    notionalCap: '75%',
    cta: { id: 'Konsultasi HNWI', en: 'HNWI Consultation' },
    ctaHref: '/contact?subject=crypto-hnwi',
    desc: {
      id: 'High-net-worth dengan dedicated support + custom override. 7 posisi simultan, leverage 20x. Sweet spot $50K (fee hanya 0.4% dari profit).',
      en: 'High-net-worth with dedicated support + custom override. 7 concurrent slots, 20x leverage. Sweet spot $50K (fee just 0.4% of profit).',
    },
    features: {
      id: [
        '7 posisi simultan · leverage 20x maks',
        'Semua strategi + custom override leverage/risk',
        'Risk per trade 2.0% · notional cap 75%',
        'Dedicated account manager (Telegram + WhatsApp)',
        'Priority support 24/7 (target response <30 menit)',
        'Custom strategy onboarding (opsional)',
      ],
      en: [
        '7 concurrent slots · max 20x leverage',
        'All strategies + custom leverage/risk override',
        '2.0% risk per trade · 75% notional cap',
        'Dedicated account manager (Telegram + WhatsApp)',
        '24/7 priority support (target response <30 min)',
        'Custom strategy onboarding (optional)',
      ],
    },
  },
];

interface TierMatrixProps {
  t: (key: string) => string;
  localeKey: Locale;
}

export function TierMatrix({ t, localeKey }: TierMatrixProps) {
  const isEn = localeKey === 'en';

  return (
    <section id="pricing" className="section-padding border-b border-border/60">
      <div className="layout-container">
        <p className="t-eyebrow mb-3">{t('pricing_eyebrow')}</p>
        <h2 className="t-display-section mb-3 max-w-xl sm:max-w-2xl">{t('pricing_title')}</h2>
        <p className="t-body text-foreground/60 max-w-xl sm:max-w-2xl mb-8 sm:mb-12">
          {t('pricing_subtitle')}
        </p>
        {/* Demo Banner */}
        {(() => {
          const demoTier = CRYPTO_TIERS_META.find((tt) => tt.id === 'demo')!;
          const bannerTitle = isEn ? 'Try Robot Crypto FREE for 30 days' : 'Coba Robot Crypto GRATIS 30 hari';
          const bannerSubtitle = isEn
            ? 'Demo wallet $5,000 USDT · 1 concurrent slot · 2x leverage · Spot DCA Trend · No credit card.'
            : 'Demo wallet $5.000 USDT · 1 posisi simultan · leverage 2x · Spot DCA Trend · Tanpa kartu kredit.';
          return (
            <div id="demo" className="mb-8 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500 text-amber-50 text-[10px] font-bold uppercase tracking-wider">
                      {demoTier.name[localeKey]}
                    </span>
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-mono uppercase tracking-wider">
                      {isEn ? 'Zero Cost · No Commitment' : 'Tanpa Biaya · Tanpa Komitmen'}
                    </span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold mb-1">{bannerTitle}</h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">{bannerSubtitle}</p>
                </div>
                <Link
                  href={demoTier.ctaHref}
                  className="btn-primary inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-md text-sm font-medium shrink-0"
                >
                  {demoTier.cta[localeKey]} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          );
        })()}

        {/* 4 paid tier grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {CRYPTO_TIERS_META.filter((tt) => tt.id !== 'demo').map((tier) => (
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
              <h3 className="text-xl font-semibold mb-1">{tier.name[localeKey]}</h3>
              <p className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider mb-3">
                {tier.modalMin[localeKey]} · {tier.slot} slot · {tier.leverage}
              </p>
              <p className="text-sm text-foreground/60 mb-4 leading-relaxed">{tier.desc[localeKey]}</p>
              <div className="flex items-baseline gap-1 mb-1 flex-wrap">
                <span className="text-3xl sm:text-4xl font-bold break-words">{formatPrice(tier.priceKey, localeKey, { compact: false })}</span>
                <span className="text-sm text-foreground/50">
                  {localeKey === 'id' ? '/bulan' : '/mo'}
                </span>
              </div>
              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-mono uppercase tracking-wider mb-5">
                Risk {tier.riskPerTrade}/trade · {localeKey === 'id' ? 'cap notional' : 'notional cap'} {tier.notionalCap}
              </p>
              <ul className="space-y-2 mb-6 flex-1">
                {tier.features[localeKey].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground/80 leading-relaxed">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={tier.ctaHref}
                className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
                  tier.popular
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-border hover:bg-accent hover:border-amber-500/40'
                }`}
              >
                {tier.cta[localeKey]} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
        <p className="text-xs text-foreground/50 mt-6 text-center">
          {t('pricing_footer')}
        </p>
      </div>
    </section>
  );
}
