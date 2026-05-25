export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/auth/cron';
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
  category: 'SIGNAL' | 'CRYPTO' | 'VPS' | 'DEMO' | 'INSTITUTIONAL';
}

const CANONICAL_TIERS: CanonicalTier[] = [
  // FOREX SIGNAL
  {
    slug: 'signal-starter', name: 'Signal Starter', name_en: 'Signal Starter',
    price: '$39/bulan',
    subtitle: 'Entry tier — coba sinyal harian',
    subtitle_en: 'Entry tier — try daily signals',
    features: ['Live signals (≤3 simbol)', '1 strategy aktif', 'Rule-based AI explainability', 'MT5 bridge ringan', 'Email support'],
    features_en: ['Live signals (≤3 symbols)', '1 active strategy', 'Rule-based AI explainability', 'Lightweight MT5 bridge', 'Email support'],
    ctaLabel: 'Mulai Starter', ctaLabel_en: 'Start Starter', ctaLink: '/register?service=signal',
    sortOrder: 10, isVisible: true, category: 'SIGNAL',
  },
  {
    slug: 'signal-pro', name: 'Signal Pro', name_en: 'Signal Pro',
    price: '$79/bulan',
    subtitle: 'Untuk trader aktif multi-pair',
    subtitle_en: 'For active multi-pair traders',
    features: ['Unlimited symbols', '5 strategi paralel', 'Mid-tier AI explainability', 'Priority MT5 latency', 'Email + Telegram support'],
    features_en: ['Unlimited symbols', '5 parallel strategies', 'Mid-tier AI explainability', 'Priority MT5 latency', 'Email + Telegram support'],
    ctaLabel: 'Mulai Pro', ctaLabel_en: 'Start Pro', ctaLink: '/register?service=signal',
    sortOrder: 20, isVisible: true, category: 'SIGNAL',
  },
  {
    slug: 'signal-vip', name: 'Signal VIP', name_en: 'Signal VIP',
    price: '$299/bulan',
    subtitle: 'Premium AI + copy-trade dashboard',
    subtitle_en: 'Premium AI + copy-trade dashboard',
    features: ['Semua fitur Pro', 'Premium AI (gradient boost)', 'Custom backtest sweep (≤10/bulan)', 'Payout API', 'Copy-trade lead dashboard'],
    features_en: ['All Pro features', 'Premium AI (gradient boost)', 'Custom backtest sweep (≤10/month)', 'Payout API', 'Copy-trade lead dashboard'],
    ctaLabel: 'Mulai VIP', ctaLabel_en: 'Start VIP', ctaLink: '/register?service=signal',
    sortOrder: 30, isVisible: true, category: 'SIGNAL',
  },
  // CRYPTO BOT — 5-tier rc29 (Binance USDT-M Futures ONLY)
  {
    slug: 'crypto-demo', name: 'Crypto Demo', name_en: 'Crypto Demo',
    price: 'Gratis',
    subtitle: 'Demo 30 hari tanpa risiko — wallet $5K USDT',
    subtitle_en: '30-day risk-free demo — $5K USDT wallet',
    features: ['1 open position slot', 'Leverage maks 2x', 'Strategi: Scalping Momentum', 'Risk per trade 0.5%', 'Telegram alert real-time'],
    features_en: ['1 open position slot', 'Max 2x leverage', 'Strategy: Scalping Momentum', '0.5% risk per trade', 'Real-time Telegram alerts'],
    ctaLabel: 'Mulai Trial Gratis', ctaLabel_en: 'Start Free Trial', ctaLink: '/register?service=crypto&tier=demo',
    sortOrder: 35, isVisible: true, category: 'CRYPTO',
  },
  {
    slug: 'crypto-starter', name: 'Crypto Starter', name_en: 'Crypto Starter',
    price: '$9/bulan (Rp149K)',
    subtitle: 'Entry tier live trading konservatif',
    subtitle_en: 'Entry tier for conservative live trading',
    features: ['2 open position slot', 'Leverage maks 3x', 'Strategi: Scalping Momentum', 'Risk per trade 1.0%', 'Kill-switch otomatis'],
    features_en: ['2 open position slots', 'Max 3x leverage', 'Strategy: Scalping Momentum', '1.0% risk per trade', 'Automatic kill-switch'],
    ctaLabel: 'Mulai Starter', ctaLabel_en: 'Start Starter', ctaLink: '/register?service=crypto&tier=starter',
    sortOrder: 40, isVisible: true, category: 'CRYPTO',
  },
  {
    slug: 'crypto-active', name: 'Crypto Active', name_en: 'Crypto Active',
    price: '$19/bulan (Rp299K)',
    subtitle: 'Diversifikasi 2 strategi untuk trader aktif',
    subtitle_en: '2-strategy diversification for active traders',
    features: ['3 open position slot', 'Leverage maks 7x', 'Strategi: Scalping Momentum + Swing SMC', 'Risk per trade 1.25%', 'Multi-stage kill-switch'],
    features_en: ['3 open position slots', 'Max 7x leverage', 'Strategies: Scalping Momentum + Swing SMC', '1.25% risk per trade', 'Multi-stage kill-switch'],
    ctaLabel: 'Mulai Active', ctaLabel_en: 'Start Active', ctaLink: '/register?service=crypto&tier=active',
    sortOrder: 50, isVisible: true, category: 'CRYPTO',
  },
  {
    slug: 'crypto-pro', name: 'Crypto Pro', name_en: 'Crypto Pro',
    price: '$49/bulan (Rp799K)',
    subtitle: 'Akses penuh 4 strategi untuk trader serius',
    subtitle_en: 'Full 4-strategy access for serious traders',
    features: ['5 open position slot', 'Leverage maks 12x', 'Strategi: Scalping Momentum + Swing SMC + Mean Reversion', 'Risk per trade 1.5%', 'Full reconciliation + audit trail'],
    features_en: ['5 open position slots', 'Max 12x leverage', 'Strategies: Scalping Momentum + Swing SMC + Mean Reversion', '1.5% risk per trade', 'Full reconciliation + audit trail'],
    ctaLabel: 'Mulai Pro', ctaLabel_en: 'Start Pro', ctaLink: '/register?service=crypto&tier=pro',
    sortOrder: 60, isVisible: true, category: 'CRYPTO',
  },
  {
    slug: 'crypto-hnwi', name: 'Crypto HNWI', name_en: 'Crypto HNWI',
    price: '$199/bulan (Rp3,29M)',
    subtitle: 'Semua 4 strategi + dedicated support untuk capital besar',
    subtitle_en: 'All 4 strategies + dedicated support for large capital',
    features: ['7 open position slot', 'Leverage maks 20x', 'Semua 4 strategi + Wyckoff Breakout + custom override', 'Risk per trade 2.0%', 'Dedicated account manager + priority 24/7'],
    features_en: ['7 open position slots', 'Max 20x leverage', 'All 4 strategies + Wyckoff Breakout + custom override', '2.0% risk per trade', 'Dedicated account manager + 24/7 priority'],
    ctaLabel: 'Konsultasi HNWI', ctaLabel_en: 'HNWI Consultation', ctaLink: '/contact?subject=crypto-hnwi',
    sortOrder: 70, isVisible: true, category: 'CRYPTO',
  },
  // VPS LICENSE — 2026-05-18 realigned to canonical 3-tier (License Only /
  // Hybrid / Full Turnkey) matching lib/pricing-format.ts:PRICE_TABLE and
  // solutions/license/page.tsx. Previous seed values ($3,000 / $7,500 / $1,499)
  // pre-dated the 2026-05-15 market recalibration and were drifting against
  // landing + solutions surfaces.
  {
    slug: 'vps-standard', name: 'Software License — License Only', name_en: 'Software License — License Only',
    price: '$320 setup + $95/bulan',
    subtitle: 'Anda host VPS, kami sediakan software + setup + support',
    subtitle_en: 'You host the VPS, we provide the software + setup + support',
    features: ['Software install di VPS broker-level milik Anda', 'Full software access + risk parameter konfigurasi sendiri', 'Rekomendasi broker BAPPEBTI teregulasi', 'Konfigurasi kustom', 'Maintenance bulanan'],
    features_en: ['Software install on your own broker-level VPS', 'Full software access + self-configurable risk params', 'BAPPEBTI-regulated broker recommendation', 'Custom configuration', 'Monthly maintenance'],
    ctaLabel: 'Konsultasi Setup', ctaLabel_en: 'Setup Consultation', ctaLink: '/register?service=vps',
    sortOrder: 80, isVisible: true, category: 'VPS',
  },
  {
    slug: 'vps-premium', name: 'Software License — Hybrid', name_en: 'Software License — Hybrid',
    price: '$750 setup + $195/bulan',
    subtitle: 'Anda host MT5, kami host backend orchestrator + monitoring',
    subtitle_en: 'You host MT5, we host the backend orchestrator + monitoring',
    features: ['VPS Windows MT5 dari broker Anda (biasanya gratis)', 'BabahAlgo sediakan VPS Linux orchestrator', 'Multi-broker bridge (MT4 + MT5)', 'Priority technical support', 'Monitoring + alert otomatis'],
    features_en: ['Windows MT5 VPS from your broker (usually free)', 'BabahAlgo provides the Linux orchestrator VPS', 'Multi-broker bridge (MT4 + MT5)', 'Priority technical support', 'Automated monitoring + alerts'],
    ctaLabel: 'Konsultasi Setup', ctaLabel_en: 'Setup Consultation', ctaLink: '/register?service=vps',
    sortOrder: 90, isVisible: true, category: 'VPS',
  },
  {
    slug: 'vps-dedicated', name: 'Software License — Full Turnkey', name_en: 'Software License — Full Turnkey',
    price: '$1,600 setup + $475/bulan',
    subtitle: 'BabahAlgo bundle 2 VPS + full management — set & forget',
    subtitle_en: 'BabahAlgo bundles 2 VPS + full management — set & forget',
    features: ['VPS Windows MT5 (8GB RAM) + VPS Linux orchestrator (12GB RAM)', 'Software install + setup + paper-trade validation', 'Monitoring 24/7 + SLA 99.5%', 'Custom risk framework + parameter tuning', 'Telegram incident channel + priority support'],
    features_en: ['Windows MT5 VPS (8GB RAM) + Linux orchestrator VPS (12GB RAM)', 'Software install + setup + paper-trade validation', '24/7 monitoring + 99.5% SLA', 'Custom risk framework + parameter tuning', 'Telegram incident channel + priority support'],
    ctaLabel: 'Konsultasi Turnkey', ctaLabel_en: 'Turnkey Consultation', ctaLink: '/contact?subject=dedicated-vps',
    sortOrder: 100, isVisible: true, category: 'VPS',
  },
  // INSTITUTIONAL / B2B
  {
    slug: 'institutional-api', name: 'Institutional API Access', name_en: 'Institutional API Access',
    price: 'Custom (usage-based)',
    subtitle: 'API priority + white-label deployment',
    subtitle_en: 'Priority API + white-label deployment',
    features: ['REST + WebSocket API priority', 'Signal streaming dedicated infra', 'Custom integration support', 'Dedicated engineering contact', 'White-label tersedia'],
    features_en: ['REST + WebSocket API priority', 'Dedicated signal streaming infra', 'Custom integration support', 'Dedicated engineering contact', 'White-label available'],
    ctaLabel: 'Speak with IR', ctaLabel_en: 'Speak with IR', ctaLink: '/register?service=institutional',
    sortOrder: 110, isVisible: true, category: 'INSTITUTIONAL',
  },
  {
    slug: 'backtest-as-service', name: 'Backtest as a Service', name_en: 'Backtest as a Service',
    price: '$99 — $999/bulan',
    subtitle: 'Backtest engine on-demand untuk trading firm',
    subtitle_en: 'On-demand backtest engine for trading firms',
    features: ['Walk-forward + Monte Carlo', '5 tahun tick data 14 instrumen', 'Strategy parameter optimization', 'Whitelabel report PDF', 'API integration'],
    features_en: ['Walk-forward + Monte Carlo', '5y tick data on 14 instruments', 'Strategy parameter optimization', 'Whitelabel report PDF', 'API integration'],
    ctaLabel: 'Konsultasi B2B', ctaLabel_en: 'B2B Consultation', ctaLink: '/contact?subject=backtest-service',
    sortOrder: 120, isVisible: true, category: 'INSTITUTIONAL',
  },
];

const DEPRECATED_SLUGS = [
  'pamm-basic', 'pamm-pro', 'pamm-standard', 'pamm-premier',
  'managed-account', 'institutional-managed',
  'signal-basic', 'signal-standard', // old $49 names
  'crypto-basic', // old 3-tier: $49 Basic (replaced by 5-tier rc29)
];

export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
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
          category: tier.category,
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
          category: tier.category,
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
