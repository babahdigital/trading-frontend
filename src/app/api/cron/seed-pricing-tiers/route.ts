export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/cron/seed-pricing-tiers');

/**
 * Sync PricingTier table dengan canonical product list per audit 2026-04-26.
 *
 * Idempotent — upsert by slug. Tidak menghapus tier yang admin add manual via CMS,
 * tapi MARK isVisible=false untuk slug deprecated (PAMM, Managed Account).
 *
 * Authorization: x-cron-secret header atau ?secret query param.
 */

interface CanonicalTier {
  slug: string;
  name: string;
  name_en: string;
  price: string;
  subtitle: string;
  subtitle_en: string;
  features: string[];
  features_en: string[];
  ctaLabel: string;
  ctaLabel_en: string;
  ctaLink: string;
  sortOrder: number;
  isVisible: boolean;
}

const CANONICAL_TIERS: CanonicalTier[] = [
  // FOREX SIGNAL
  {
    slug: 'signal-starter', name: 'Signal Starter', name_en: 'Signal Starter',
    price: '$19/bulan',
    subtitle: 'Entry tier — coba sinyal harian',
    subtitle_en: 'Entry tier — try daily signals',
    features: ['Live signals (≤3 simbol)', '1 strategy aktif', 'Rule-based AI explainability', 'MT5 bridge ringan', 'Email support'],
    features_en: ['Live signals (≤3 symbols)', '1 active strategy', 'Rule-based AI explainability', 'Lightweight MT5 bridge', 'Email support'],
    ctaLabel: 'Mulai Starter', ctaLabel_en: 'Start Starter', ctaLink: '/register/signal',
    sortOrder: 10, isVisible: true,
  },
  {
    slug: 'signal-pro', name: 'Signal Pro', name_en: 'Signal Pro',
    price: '$79/bulan',
    subtitle: 'Untuk trader aktif multi-pair',
    subtitle_en: 'For active multi-pair traders',
    features: ['Unlimited symbols', '5 strategi paralel', 'Mid-tier AI explainability', 'Priority MT5 latency', 'Email + Telegram support'],
    features_en: ['Unlimited symbols', '5 parallel strategies', 'Mid-tier AI explainability', 'Priority MT5 latency', 'Email + Telegram support'],
    ctaLabel: 'Mulai Pro', ctaLabel_en: 'Start Pro', ctaLink: '/register/signal',
    sortOrder: 20, isVisible: true,
  },
  {
    slug: 'signal-vip', name: 'Signal VIP', name_en: 'Signal VIP',
    price: '$299/bulan',
    subtitle: 'Premium AI + copy-trade dashboard',
    subtitle_en: 'Premium AI + copy-trade dashboard',
    features: ['Semua fitur Pro', 'Premium AI (gradient boost)', 'Custom backtest sweep (≤10/bulan)', 'Payout API', 'Copy-trade lead dashboard'],
    features_en: ['All Pro features', 'Premium AI (gradient boost)', 'Custom backtest sweep (≤10/month)', 'Payout API', 'Copy-trade lead dashboard'],
    ctaLabel: 'Mulai VIP', ctaLabel_en: 'Start VIP', ctaLink: '/register/signal',
    sortOrder: 30, isVisible: true,
  },
  // CRYPTO BOT
  {
    slug: 'crypto-basic', name: 'Crypto Basic', name_en: 'Crypto Basic',
    price: '$49/bulan + 20% PS',
    subtitle: 'Bot Binance Futures untuk trader pemula',
    subtitle_en: 'Binance Futures bot for entry traders',
    features: ['3 pair otomatis', 'Leverage maks 5x', 'Strategi scalping_momentum', 'Telegram + dashboard', 'Email support'],
    features_en: ['3 auto pairs', 'Max leverage 5x', 'Scalping momentum strategy', 'Telegram + dashboard', 'Email support'],
    ctaLabel: 'Mulai Basic', ctaLabel_en: 'Start Basic', ctaLink: '/register/crypto?tier=basic',
    sortOrder: 40, isVisible: true,
  },
  {
    slug: 'crypto-pro', name: 'Crypto Pro', name_en: 'Crypto Pro',
    price: '$199/bulan + 15% PS',
    subtitle: 'Multi-strategi untuk trader aktif',
    subtitle_en: 'Multi-strategy for active traders',
    features: ['8 pair + 1 manual whitelist', 'Leverage maks 10x', '4 strategi (SMC, Wyckoff, Momentum, Mean Reversion)', 'Telegram VIP + priority support'],
    features_en: ['8 pairs + 1 manual whitelist', 'Max leverage 10x', '4 strategies (SMC, Wyckoff, Momentum, Mean Reversion)', 'Telegram VIP + priority support'],
    ctaLabel: 'Mulai Pro', ctaLabel_en: 'Start Pro', ctaLink: '/register/crypto?tier=pro',
    sortOrder: 50, isVisible: true,
  },
  {
    slug: 'crypto-hnwi', name: 'Crypto HNWI', name_en: 'Crypto HNWI',
    price: '$499/bulan + 10% PS',
    subtitle: 'Capital besar dengan dedicated manager',
    subtitle_en: 'Large capital with dedicated manager',
    features: ['12 pair + custom whitelist/blacklist', 'Leverage maks 15x', 'Semua strategi + parameter tuning', 'Dedicated account manager', 'SLA 99.9%'],
    features_en: ['12 pairs + custom whitelist/blacklist', 'Max leverage 15x', 'All strategies + parameter tuning', 'Dedicated account manager', 'SLA 99.9%'],
    ctaLabel: 'Konsultasi HNWI', ctaLabel_en: 'HNWI Consultation', ctaLink: '/contact?subject=crypto-hnwi',
    sortOrder: 60, isVisible: true,
  },
  // VPS LICENSE
  {
    slug: 'vps-standard', name: 'VPS License', name_en: 'VPS License',
    price: '$3,000 setup + $150/bulan',
    subtitle: 'Bot terinstal di VPS pribadi Anda',
    subtitle_en: 'Bot installed on your private VPS',
    features: ['Dedicated VPS broker-level', 'Full bot access + risk parameter', 'Affiliate broker discount', 'Konfigurasi kustom'],
    features_en: ['Dedicated broker-level VPS', 'Full bot access + risk parameters', 'Affiliate broker discount', 'Custom configuration'],
    ctaLabel: 'Konsultasi Setup', ctaLabel_en: 'Setup Consultation', ctaLink: '/register/vps',
    sortOrder: 70, isVisible: true,
  },
  {
    slug: 'vps-premium', name: 'VPS Premium', name_en: 'VPS Premium',
    price: '$7,500 setup + $300/bulan',
    subtitle: 'Multi-broker, multi-akun, dedicated support',
    subtitle_en: 'Multi-broker, multi-account, dedicated support',
    features: ['Multi-broker bridge (MT4 + MT5)', 'Up to 3 akun paralel', 'Custom strategy parameter', 'Priority support 24/7'],
    features_en: ['Multi-broker bridge (MT4 + MT5)', 'Up to 3 parallel accounts', 'Custom strategy parameters', 'Priority support 24/7'],
    ctaLabel: 'Konsultasi Setup', ctaLabel_en: 'Setup Consultation', ctaLink: '/register/vps',
    sortOrder: 80, isVisible: true,
  },
  {
    slug: 'vps-dedicated', name: 'Dedicated Tier', name_en: 'Dedicated Tier',
    price: '$1,499/bulan',
    subtitle: 'VPS isolated single-customer',
    subtitle_en: 'Single-customer isolated VPS',
    features: ['Dedicated MT5 bridge VPS', 'Isolated DB schema', '24/7 Telegram incident channel', 'Custom risk framework', 'SLA 99.9%'],
    features_en: ['Dedicated MT5 bridge VPS', 'Isolated DB schema', '24/7 Telegram incident channel', 'Custom risk framework', 'SLA 99.9%'],
    ctaLabel: 'Konsultasi Dedicated', ctaLabel_en: 'Dedicated Consultation', ctaLink: '/contact?subject=dedicated-vps',
    sortOrder: 90, isVisible: true,
  },
  // INSTITUTIONAL / B2B
  {
    slug: 'institutional-api', name: 'Institutional API Access', name_en: 'Institutional API Access',
    price: 'Custom (usage-based)',
    subtitle: 'API priority + white-label deployment',
    subtitle_en: 'Priority API + white-label deployment',
    features: ['REST + WebSocket API priority', 'Signal streaming dedicated infra', 'Custom integration support', 'Dedicated engineering contact', 'White-label tersedia'],
    features_en: ['REST + WebSocket API priority', 'Dedicated signal streaming infra', 'Custom integration support', 'Dedicated engineering contact', 'White-label available'],
    ctaLabel: 'Speak with IR', ctaLabel_en: 'Speak with IR', ctaLink: '/register/institutional',
    sortOrder: 100, isVisible: true,
  },
  {
    slug: 'backtest-as-service', name: 'Backtest as a Service', name_en: 'Backtest as a Service',
    price: '$99 — $999/bulan',
    subtitle: 'Backtest engine on-demand untuk trading firm',
    subtitle_en: 'On-demand backtest engine for trading firms',
    features: ['Walk-forward + Monte Carlo', '5 tahun tick data 14 instrumen', 'Strategy parameter optimization', 'Whitelabel report PDF', 'API integration'],
    features_en: ['Walk-forward + Monte Carlo', '5y tick data on 14 instruments', 'Strategy parameter optimization', 'Whitelabel report PDF', 'API integration'],
    ctaLabel: 'Konsultasi B2B', ctaLabel_en: 'B2B Consultation', ctaLink: '/contact?subject=backtest-service',
    sortOrder: 110, isVisible: true,
  },
];

const DEPRECATED_SLUGS = [
  'pamm-basic', 'pamm-pro', 'pamm-standard', 'pamm-premier',
  'managed-account', 'institutional-managed',
  'signal-basic', 'signal-standard', // old $49 names
];

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && header === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const upserted: string[] = [];
  const hidden: string[] = [];

  try {
    for (const tier of CANONICAL_TIERS) {
      await prisma.pricingTier.upsert({
        where: { slug: tier.slug },
        update: {
          name: tier.name,
          name_en: tier.name_en,
          price: tier.price,
          subtitle: tier.subtitle,
          subtitle_en: tier.subtitle_en,
          features: tier.features,
          features_en: tier.features_en,
          ctaLabel: tier.ctaLabel,
          ctaLabel_en: tier.ctaLabel_en,
          ctaLink: tier.ctaLink,
          sortOrder: tier.sortOrder,
          isVisible: tier.isVisible,
        },
        create: {
          slug: tier.slug,
          name: tier.name,
          name_en: tier.name_en,
          price: tier.price,
          subtitle: tier.subtitle,
          subtitle_en: tier.subtitle_en,
          features: tier.features,
          features_en: tier.features_en,
          ctaLabel: tier.ctaLabel,
          ctaLabel_en: tier.ctaLabel_en,
          ctaLink: tier.ctaLink,
          sortOrder: tier.sortOrder,
          isVisible: tier.isVisible,
        },
      });
      upserted.push(tier.slug);
    }

    // Hide deprecated slugs (don't delete — might have FK or audit refs)
    for (const slug of DEPRECATED_SLUGS) {
      const existing = await prisma.pricingTier.findUnique({ where: { slug } });
      if (existing && existing.isVisible) {
        await prisma.pricingTier.update({
          where: { slug },
          data: { isVisible: false },
        });
        hidden.push(slug);
      }
    }

    return NextResponse.json({
      status: 'ok',
      upserted,
      hidden,
      total_canonical: CANONICAL_TIERS.length,
    });
  } catch (err) {
    log.error(`Pricing seed error: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json(
      { error: 'seed_failed', message: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}

export const POST = GET;
