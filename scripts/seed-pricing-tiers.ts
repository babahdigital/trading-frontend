/**
 * Seed PricingTier dari PRICE_TABLE (lib/pricing-format.ts) — single source
 * of truth migration ke DB-backed pricing. Idempotent: upsert per slug.
 *
 * Run:
 *   npx tsx scripts/seed-pricing-tiers.ts
 *   atau via container:
 *   docker exec trading-commercial-app-1 npx tsx scripts/seed-pricing-tiers.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface TierSeed {
  slug: string;
  category: 'SIGNAL' | 'CRYPTO' | 'VPS' | 'DEMO' | 'INSTITUTIONAL';
  productSlug: string;
  name: string;
  name_en: string;
  price: string;
  priceIdr: number;
  priceUsd: number;
  subtitle: string;
  subtitle_en: string;
  features: string[];
  features_en: string[];
  ctaLabel: string;
  ctaLabel_en: string;
  ctaLink: string;
  popular: boolean;
  sortOrder: number;
  metadata: Record<string, string | number | boolean | string[] | null>;
}

const TIERS: TierSeed[] = [
  // ─── Crypto rc29 (5-tier) ────────────────────────────────────────
  {
    slug: 'crypto-demo',
    category: 'DEMO', productSlug: 'crypto',
    name: 'Demo Free', name_en: 'Demo Free',
    price: 'Rp 0', priceIdr: 0, priceUsd: 0,
    subtitle: 'Coba 30 hari gratis, wallet simulasi $5.000 USDT',
    subtitle_en: '30-day free trial, $5,000 USDT sim wallet',
    features: [
      'Wallet simulasi $5.000 USDT (zero risk)',
      'Akses penuh 3 strategi inti',
      'Multi-stage kill-switch + audit log',
      'Setelah profit konsisten, upgrade ke ≥$500',
    ],
    features_en: [
      '$5,000 USDT sim wallet (zero risk)',
      'Full access to 3 core strategies',
      'Multi-stage kill-switch + audit log',
      'After consistent profit, upgrade to ≥$500',
    ],
    ctaLabel: 'Mulai Demo Gratis', ctaLabel_en: 'Start Free Demo',
    ctaLink: '/register?service=crypto&tier=demo',
    popular: false, sortOrder: 10,
    metadata: { slot: 1, leverage: '2x', riskPerTrade: '0.5%', notionalCap: '30%', modalMin: 0, accountMode: 'demo', demoWalletUsdt: 5000 },
  },
  {
    slug: 'crypto-starter',
    category: 'CRYPTO', productSlug: 'crypto',
    name: 'Starter', name_en: 'Starter',
    price: 'Rp 149.000', priceIdr: 149_000, priceUsd: 9,
    subtitle: 'Entry live trading untuk modal ≥ $500',
    subtitle_en: 'Entry live trading for capital ≥ $500',
    features: [
      '2 posisi simultan · leverage 3x maks',
      'Strategi Spot DCA Trend (konservatif)',
      'Risk per trade 1.0% · notional cap 40%',
      'Kill-switch otomatis + cooldown',
      'Email + Telegram notification · sweet spot $1K',
    ],
    features_en: [
      '2 concurrent positions · max 3x leverage',
      'Spot DCA Trend strategy (conservative)',
      'Risk per trade 1.0% · notional cap 40%',
      'Automatic kill-switch + cooldown',
      'Email + Telegram notifications · sweet spot $1K',
    ],
    ctaLabel: 'Mulai Starter', ctaLabel_en: 'Start Starter',
    ctaLink: '/checkout?tier=CRYPTO_STARTER&provider=xendit',
    popular: false, sortOrder: 20,
    metadata: { slot: 2, leverage: '3x', riskPerTrade: '1.0%', notionalCap: '40%', modalMin: 500, sweetSpotUsd: 1000 },
  },
  {
    slug: 'crypto-active',
    category: 'CRYPTO', productSlug: 'crypto',
    name: 'Active', name_en: 'Active',
    price: 'Rp 299.000', priceIdr: 299_000, priceUsd: 19,
    subtitle: 'Sweet spot trader — modal $1.500-5.000',
    subtitle_en: 'Sweet spot trader — $1,500-5,000 capital',
    features: [
      '3 posisi simultan · leverage 7x maks',
      'Spot DCA Trend + Spot Swing Trend',
      'Risk per trade 1.25% · notional cap 55%',
      'Kill-switch + cooldown + audit trail',
      'Sweet spot modal $2.500 (fee hanya 1.5% dari profit)',
    ],
    features_en: [
      '3 concurrent positions · max 7x leverage',
      'Spot DCA Trend + Spot Swing Trend',
      'Risk per trade 1.25% · notional cap 55%',
      'Kill-switch + cooldown + audit trail',
      'Sweet spot capital $2,500 (fee only 1.5% of profit)',
    ],
    ctaLabel: 'Mulai Active', ctaLabel_en: 'Start Active',
    ctaLink: '/checkout?tier=CRYPTO_ACTIVE&provider=xendit',
    popular: true, sortOrder: 30,
    metadata: { slot: 3, leverage: '7x', riskPerTrade: '1.25%', notionalCap: '55%', modalMin: 1500, sweetSpotUsd: 2500 },
  },
  {
    slug: 'crypto-pro',
    category: 'CRYPTO', productSlug: 'crypto',
    name: 'Pro', name_en: 'Pro',
    price: 'Rp 799.000', priceIdr: 799_000, priceUsd: 49,
    subtitle: 'Trader serius dengan akses penuh 3 strategi',
    subtitle_en: 'Serious traders with full access to 3 strategies',
    features: [
      '5 posisi simultan · leverage 12x maks',
      'Semua strategi: Smart Money + Spot DCA + Spot Swing',
      'Risk per trade 1.5% · notional cap 60% · audit trail',
      'Priority signal queue (low-latency) + custom risk profile',
      'Sweet spot modal $10K (fee hanya 0.5% dari profit)',
    ],
    features_en: [
      '5 concurrent positions · max 12x leverage',
      'All strategies: Smart Money + Spot DCA + Spot Swing',
      'Risk per trade 1.5% · notional cap 60% · audit trail',
      'Priority signal queue (low-latency) + custom risk profile',
      'Sweet spot capital $10K (fee only 0.5% of profit)',
    ],
    ctaLabel: 'Mulai Pro', ctaLabel_en: 'Start Pro',
    ctaLink: '/checkout?tier=CRYPTO_PRO&provider=xendit',
    popular: false, sortOrder: 40,
    metadata: { slot: 5, leverage: '12x', riskPerTrade: '1.5%', notionalCap: '60%', modalMin: 5000, sweetSpotUsd: 10000 },
  },
  {
    slug: 'crypto-hnwi',
    category: 'CRYPTO', productSlug: 'crypto',
    name: 'HNWI', name_en: 'HNWI',
    price: 'Rp 3.290.000', priceIdr: 3_290_000, priceUsd: 199,
    subtitle: 'High-net-worth dengan dedicated support + custom parameter',
    subtitle_en: 'High-net-worth with dedicated support + custom parameter',
    features: [
      '7 posisi simultan · leverage 20x maks',
      'Risk per trade 2.0% · notional cap 75%',
      'Semua strategi + custom parameter tuning',
      'Dedicated support manager · SLA 99.9%',
      'Sweet spot modal $50K (fee hanya 0.4% dari profit)',
    ],
    features_en: [
      '7 concurrent positions · max 20x leverage',
      'Risk per trade 2.0% · notional cap 75%',
      'All strategies + custom parameter tuning',
      'Dedicated support manager · SLA 99.9%',
      'Sweet spot capital $50K (fee only 0.4% of profit)',
    ],
    ctaLabel: 'Konsultasi HNWI', ctaLabel_en: 'HNWI Consultation',
    ctaLink: '/contact?subject=crypto-hnwi',
    popular: false, sortOrder: 50,
    metadata: { slot: 7, leverage: '20x', riskPerTrade: '2.0%', notionalCap: '75%', modalMin: 25000, sweetSpotUsd: 50000 },
  },

  // ─── Signal Forex (3-tier) ────────────────────────────────────────
  {
    slug: 'signal-starter',
    category: 'SIGNAL', productSlug: 'signal',
    name: 'Tier 1 · Swing', name_en: 'Tier 1 · Swing',
    price: 'Rp 600.000', priceIdr: 600_000, priceUsd: 39,
    subtitle: '3 pair major · swing only · email + dashboard',
    subtitle_en: '3 major pairs · swing only · email + dashboard',
    features: [
      '3 pair major (EURUSD · GBPUSD · USDJPY)',
      'Strategi swing only (durasi 4-24 jam)',
      'Indikator dasar SMC Scalper (Quasimodo)',
      'Notifikasi Email + Dashboard',
      'Auto-eksekusi di MT5 Anda',
    ],
    features_en: [
      '3 major pairs (EURUSD · GBPUSD · USDJPY)',
      'Swing-only strategy (4-24h hold)',
      'Base SMC Scalper indicator (Quasimodo)',
      'Email + Dashboard notifications',
      'Auto-execution on your MT5',
    ],
    ctaLabel: 'Mulai Tier 1', ctaLabel_en: 'Start Tier 1',
    ctaLink: '/checkout?tier=SIGNAL_STARTER&provider=xendit',
    popular: false, sortOrder: 110,
    metadata: { pairs: 3, strategy: 'swing', notification: ['email', 'dashboard'] },
  },
  {
    slug: 'signal-pro',
    category: 'SIGNAL', productSlug: 'signal',
    name: 'Tier 2 · Scalping', name_en: 'Tier 2 · Scalping',
    price: 'Rp 1.290.000', priceIdr: 1_290_000, priceUsd: 79,
    subtitle: '8 pair · swing + scalping · WhatsApp + Telegram',
    subtitle_en: '8 pairs · swing + scalping · WhatsApp + Telegram',
    features: [
      '8 pair (Major · Cross · Gold · Silver)',
      'Strategi swing + scalping',
      'Indikator advanced SMC Scalper + SMC Swing',
      'Notifikasi WhatsApp + Telegram + Email',
      'Mid-tier AI explainability per trade',
    ],
    features_en: [
      '8 pairs (Major · Cross · Gold · Silver)',
      'Swing + scalping strategy',
      'Advanced SMC Scalper + SMC Swing indicators',
      'WhatsApp + Telegram + Email notifications',
      'Mid-tier AI explainability per trade',
    ],
    ctaLabel: 'Mulai Tier 2', ctaLabel_en: 'Start Tier 2',
    ctaLink: '/checkout?tier=SIGNAL_PRO&provider=xendit',
    popular: true, sortOrder: 120,
    metadata: { pairs: 8, strategy: 'swing+scalping', notification: ['whatsapp', 'telegram', 'email'] },
  },
  {
    slug: 'signal-vip',
    category: 'SIGNAL', productSlug: 'signal',
    name: 'Tier 3 · All-In', name_en: 'Tier 3 · All-In',
    price: 'Rp 4.900.000', priceIdr: 4_900_000, priceUsd: 299,
    subtitle: 'Unlimited pair · 3 strategi paralel · dedicated 24/7',
    subtitle_en: 'Unlimited pairs · 3 strategies parallel · dedicated 24/7',
    features: [
      'Unlimited pair (Major · Cross · Metals · Index)',
      'Semua 3 strategi paralel',
      'Premium research advisor + dashboard copy-trade',
      'Notifikasi semua channel + dedicated support 24/7',
      'Custom backtest sweep (≤10/bulan) + Payout API',
    ],
    features_en: [
      'Unlimited pairs (Major · Cross · Metals · Index)',
      'All 3 strategies in parallel',
      'Premium research advisor + copy-trade dashboard',
      'All notification channels + dedicated 24/7 support',
      'Custom backtest sweeps (≤10/month) + Payout API',
    ],
    ctaLabel: 'Mulai Tier 3', ctaLabel_en: 'Start Tier 3',
    ctaLink: '/checkout?tier=SIGNAL_VIP&provider=xendit',
    popular: false, sortOrder: 130,
    metadata: { pairs: 'unlimited', strategy: 'all-3-parallel', notification: 'all-channels', sla: '24/7' },
  },

  // ─── VPS Software License (3-tier) ────────────────────────────────
  {
    slug: 'vps-license-only',
    category: 'VPS', productSlug: 'vps',
    name: 'License Only', name_en: 'License Only',
    price: 'Rp 5.000.000', priceIdr: 5_000_000, priceUsd: 320,
    subtitle: 'Software license + install + support (klien sediakan VPS)',
    subtitle_en: 'Software license + install + support (client provides VPS)',
    features: [
      'Software license + remote install + konfigurasi strategi',
      'Full software access + risk parameter konfigurasi sendiri',
      'Anda host VPS Windows MT5 — kami kirim software & support',
      'Rekomendasi broker BAPPEBTI teregulasi',
      'Maintenance bulanan inklusif',
    ],
    features_en: [
      'Software license + remote install + strategy config',
      'Full software access + self-managed risk parameters',
      'You host Windows MT5 VPS — we ship software & support',
      'BAPPEBTI-licensed broker recommendation',
      'Monthly maintenance included',
    ],
    ctaLabel: 'Mulai License', ctaLabel_en: 'Start License',
    ctaLink: '/register?service=vps&tier=license-only',
    popular: false, sortOrder: 210,
    metadata: { hosting: 'self-hosted', monthlyIdr: 1_500_000, monthlyUsd: 95 },
  },
  {
    slug: 'vps-hybrid',
    category: 'VPS', productSlug: 'vps',
    name: 'Hybrid', name_en: 'Hybrid',
    price: 'Rp 12.000.000', priceIdr: 12_000_000, priceUsd: 750,
    subtitle: 'Klien punya Windows MT5, kami provision Linux orchestrator',
    subtitle_en: 'Client provides Windows MT5, we provision Linux orchestrator',
    features: [
      'Linux orchestrator provisioned + managed by us',
      'Anda host Windows MT5 (broker sediakan)',
      'Monitoring + auto-restart + log aggregation',
      'Strategi update push automatic',
      'Email + Telegram notification ke admin Anda',
    ],
    features_en: [
      'Linux orchestrator provisioned + managed by us',
      'You host Windows MT5 (broker provides)',
      'Monitoring + auto-restart + log aggregation',
      'Automatic strategy update push',
      'Email + Telegram notifications to your admin',
    ],
    ctaLabel: 'Mulai Hybrid', ctaLabel_en: 'Start Hybrid',
    ctaLink: '/register?service=vps&tier=hybrid',
    popular: true, sortOrder: 220,
    metadata: { hosting: 'hybrid', monthlyIdr: 3_000_000, monthlyUsd: 195 },
  },
  {
    slug: 'vps-turnkey',
    category: 'VPS', productSlug: 'vps',
    name: 'Full Turnkey', name_en: 'Full Turnkey',
    price: 'Rp 25.000.000', priceIdr: 25_000_000, priceUsd: 1_600,
    subtitle: 'Bundle 2 VPS + full management — set & forget',
    subtitle_en: 'Bundle 2 VPS + full management — set & forget',
    features: [
      'Bundle Windows MT5 + Linux orchestrator',
      'Full management — kami handle uptime + restart + backup',
      'Custom strategy tuning per portfolio Anda',
      'SLA 99.9% + dedicated technical contact',
      'Quarterly performance review call',
    ],
    features_en: [
      'Bundle Windows MT5 + Linux orchestrator',
      'Fully managed — we handle uptime + restart + backup',
      'Custom strategy tuning per your portfolio',
      'SLA 99.9% + dedicated technical contact',
      'Quarterly performance review call',
    ],
    ctaLabel: 'Konsultasi Turnkey', ctaLabel_en: 'Turnkey Consultation',
    ctaLink: '/contact?subject=dedicated-vps',
    popular: false, sortOrder: 230,
    metadata: { hosting: 'turnkey', monthlyIdr: 7_500_000, monthlyUsd: 475 },
  },
];

async function main() {
  console.log(`Seeding ${TIERS.length} pricing tiers…`);
  for (const tier of TIERS) {
    const { features, features_en, metadata, ...rest } = tier;
    const result = await prisma.pricingTier.upsert({
      where: { slug: tier.slug },
      create: {
        ...rest,
        features,
        features_en,
        metadata,
        excluded: [],
        en_synced_at: new Date(),
      },
      update: {
        ...rest,
        features,
        features_en,
        metadata,
        en_synced_at: new Date(),
      },
    });
    console.log(`  ✓ ${result.slug} (${tier.category}) Rp ${tier.priceIdr.toLocaleString('id-ID')} / $${tier.priceUsd}`);
  }
  console.log(`✓ Seeded ${TIERS.length} tiers`);
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
