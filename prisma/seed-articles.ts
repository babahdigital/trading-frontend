import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const articles = [
  {
    slug: 'weekly-recap-2026-04-14',
    title: 'Weekly Research Recap — 14 Apr to 18 Apr 2026',
    title_en: 'Weekly Research Recap — Apr 14 to Apr 18, 2026',
    excerpt: 'Rangkuman 23 sinyal minggu ini, top pair XAUUSD dengan confidence rata-rata 0.82. Distribusi H4 mendominasi phase minggu ini.',
    excerpt_en: 'Summary of 23 signals this week, top pair XAUUSD with average confidence 0.82. H4 distribution dominated this week\'s phase.',
    body: `# Weekly Research Recap

**Period:** 14 April – 18 April 2026

**Total signals:** 23
**Top pair:** XAUUSD
**Average confidence:** 0.82

## Market Overview

Minggu ini didominasi oleh fase distribusi pada timeframe H4, terutama pada pair-pair major. XAUUSD menjadi pair paling aktif dengan 8 sinyal, diikuti oleh BTCUSD (5 sinyal) dan EURUSD (4 sinyal).

## Highlights

- **XAUUSD** — 8 sinyal dengan win rate 75%. Fase distribusi H4 memberikan entry optimal pada M15 setelah liquidity sweep di level 2,380.
- **BTCUSD** — 5 sinyal, mayoritas SELL. BOS bearish pada H1 terkonfirmasi dengan volume declining. Target 62,000 tercapai 3 dari 5 sinyal.
- **EURUSD** — 4 sinyal mixed. Consolidation range 1.0850-1.0920 memberikan scalping opportunity pada kedua arah.
- **GBPJPY** — 3 sinyal SELL. Wyckoff distribution pada H4 dengan spring event teridentifikasi di 191.50.

## Key Observations

1. **SMC Entry dominasi** — 78% sinyal menggunakan Smart Money Concept entry, menunjukkan institutional flow yang kuat.
2. **Confidence threshold** — Sinyal dengan confidence > 0.80 memiliki win rate 85%, sementara 0.70-0.80 hanya 62%.
3. **Timeframe correlation** — H4 distribution + H1 BOS bearish + M15 bias bearish menghasilkan setup paling reliable minggu ini.

## Risk Notes

Volatilitas meningkat menjelang FOMC statement minggu depan. Posisi sizing telah disesuaikan dari 2% menjadi 1.5% per trade untuk mengantisipasi gap risk.`,
    body_en: `# Weekly Research Recap

**Period:** April 14 – April 18, 2026

**Total signals:** 23
**Top pair:** XAUUSD
**Average confidence:** 0.82

## Market Overview

This week was dominated by distribution phases on the H4 timeframe, particularly on major pairs. XAUUSD was the most active pair with 8 signals, followed by BTCUSD (5 signals) and EURUSD (4 signals).

## Highlights

- **XAUUSD** — 8 signals with 75% win rate. H4 distribution phase provided optimal M15 entries after liquidity sweep at the 2,380 level.
- **BTCUSD** — 5 signals, majority SELL. Bearish BOS on H1 confirmed with declining volume. Target 62,000 reached on 3 of 5 signals.
- **EURUSD** — 4 mixed signals. Consolidation range 1.0850-1.0920 provided scalping opportunities in both directions.
- **GBPJPY** — 3 SELL signals. Wyckoff distribution on H4 with spring event identified at 191.50.

## Key Observations

1. **SMC Entry dominance** — 78% of signals used Smart Money Concept entries, indicating strong institutional flow.
2. **Confidence threshold** — Signals with confidence > 0.80 had 85% win rate, while 0.70-0.80 only achieved 62%.
3. **Timeframe correlation** — H4 distribution + H1 bearish BOS + M15 bearish bias produced the most reliable setups this week.

## Risk Notes

Volatility increasing ahead of next week's FOMC statement. Position sizing adjusted from 2% to 1.5% per trade to anticipate gap risk.`,
    category: 'RESEARCH',
    author: 'BabahAlgo Research Desk',
    readTime: 5,
  },
  {
    slug: 'weekly-recap-2026-04-07',
    title: 'Weekly Research Recap — 7 Apr to 11 Apr 2026',
    title_en: 'Weekly Research Recap — Apr 7 to Apr 11, 2026',
    excerpt: 'Rangkuman 18 sinyal minggu ini, top pair BTCUSD dengan confidence rata-rata 0.79. Accumulation phase teridentifikasi pada crypto pairs.',
    excerpt_en: 'Summary of 18 signals this week, top pair BTCUSD with average confidence 0.79. Accumulation phase identified on crypto pairs.',
    body: `# Weekly Research Recap

**Period:** 7 April – 11 April 2026

**Total signals:** 18
**Top pair:** BTCUSD
**Average confidence:** 0.79

## Highlights

- **BTCUSD** — 7 sinyal dengan dominasi BUY. Wyckoff accumulation phase pada H4, spring event di 59,800 memberikan entry optimal. Target 64,000 tercapai.
- **XAUUSD** — 4 sinyal SELL. Distribution phase berlanjut dengan BOS bearish pada H1. Resistance 2,400 bertahan kuat.
- **USDJPY** — 3 sinyal BUY. Trend continuation bullish setelah break structure di 152.80.
- **EURUSD** — 2 sinyal ranging. Market consolidation menjelang ECB meeting.

## Performance

Win rate keseluruhan: 72% (13/18)
Average R:R realized: 1.8:1
Best performer: BTCUSD accumulation longs (+4.2%)`,
    body_en: `# Weekly Research Recap

**Period:** April 7 – April 11, 2026

**Total signals:** 18
**Top pair:** BTCUSD
**Average confidence:** 0.79

## Highlights

- **BTCUSD** — 7 signals with BUY dominance. Wyckoff accumulation phase on H4, spring event at 59,800 provided optimal entry. Target 64,000 reached.
- **XAUUSD** — 4 SELL signals. Distribution phase continued with bearish BOS on H1. Resistance at 2,400 held strong.
- **USDJPY** — 3 BUY signals. Bullish trend continuation after break of structure at 152.80.
- **EURUSD** — 2 ranging signals. Market consolidation ahead of ECB meeting.

## Performance

Overall win rate: 72% (13/18)
Average R:R realized: 1.8:1
Best performer: BTCUSD accumulation longs (+4.2%)`,
    category: 'RESEARCH',
    author: 'BabahAlgo Research Desk',
    readTime: 4,
  },
  {
    slug: 'smc-entry-optimization',
    title: 'Optimasi Entry Smart Money Concept: Dari Teori ke Eksekusi',
    title_en: 'Smart Money Concept Entry Optimization: From Theory to Execution',
    excerpt: 'Bagaimana BabahAlgo mengoptimasi SMC entry dengan multi-timeframe confluence scoring. Data 6 bulan menunjukkan peningkatan win rate 12%.',
    excerpt_en: 'How BabahAlgo optimizes SMC entries with multi-timeframe confluence scoring. 6-month data shows 12% win rate improvement.',
    body: `# Optimasi Entry Smart Money Concept

## Latar Belakang

Smart Money Concept (SMC) telah menjadi framework utama dalam analisis teknikal modern. Di BabahAlgo, kami menggunakan SMC sebagai salah satu dari 6 strategi aktif, namun dengan pendekatan quantitative yang membedakan dari implementasi manual.

## Metodologi

### Multi-Timeframe Confluence Score

Setiap sinyal SMC melewati 3 filter timeframe:

1. **H4 Phase Detection** — Mengidentifikasi Wyckoff phase (accumulation/distribution/markup/markdown)
2. **H1 Structure Break** — Konfirmasi BOS (Break of Structure) atau ChoCH (Change of Character)
3. **M15 Bias Alignment** — Entry timing berdasarkan order block dan fair value gap

### Confidence Scoring

Confidence score dihitung dari:
- Phase alignment across timeframes: 30%
- Volume confirmation: 20%
- Order block strength: 25%
- Historical pair behavior: 15%
- Session timing: 10%

## Hasil (6 Bulan Terakhir)

| Metric | Sebelum Optimasi | Setelah Optimasi |
|--------|:---:|:---:|
| Win Rate | 63% | 75% |
| Avg R:R | 1.5:1 | 2.1:1 |
| Signals/Week | 35 | 22 |
| Max Drawdown | 8.2% | 4.7% |

Pengurangan jumlah sinyal adalah by design — kami memilih kualitas over kuantitas.

## Kesimpulan

Confluence scoring membantu filter noise dan meningkatkan probability. Trader yang mengikuti sinyal high-confidence (>0.80) mendapatkan win rate 85%.`,
    body_en: `# Smart Money Concept Entry Optimization

## Background

Smart Money Concept (SMC) has become a primary framework in modern technical analysis. At BabahAlgo, we use SMC as one of 6 active strategies, but with a quantitative approach that differentiates from manual implementation.

## Methodology

### Multi-Timeframe Confluence Score

Each SMC signal passes through 3 timeframe filters:

1. **H4 Phase Detection** — Identifying Wyckoff phases (accumulation/distribution/markup/markdown)
2. **H1 Structure Break** — Confirming BOS (Break of Structure) or ChoCH (Change of Character)
3. **M15 Bias Alignment** — Entry timing based on order blocks and fair value gaps

### Confidence Scoring

Confidence score calculated from:
- Phase alignment across timeframes: 30%
- Volume confirmation: 20%
- Order block strength: 25%
- Historical pair behavior: 15%
- Session timing: 10%

## Results (Last 6 Months)

| Metric | Before Optimization | After Optimization |
|--------|:---:|:---:|
| Win Rate | 63% | 75% |
| Avg R:R | 1.5:1 | 2.1:1 |
| Signals/Week | 35 | 22 |
| Max Drawdown | 8.2% | 4.7% |

The reduction in signal count is by design — we chose quality over quantity.

## Conclusion

Confluence scoring helps filter noise and improve probability. Traders following high-confidence signals (>0.80) achieve 85% win rate.`,
    category: 'STRATEGY',
    author: 'BabahAlgo Research Desk',
    readTime: 8,
  },
  {
    slug: 'risk-framework-12-layers',
    title: 'Cara Kerja 12-Layer Risk Framework Kami',
    title_en: 'How Our 12-Layer Risk Framework Works',
    excerpt: 'Dari position sizing hingga correlation filter dan drawdown circuit breaker. Transparansi penuh tentang setiap lapisan proteksi.',
    excerpt_en: 'From position sizing to correlation filters and drawdown circuit breakers. Full transparency on every protection layer.',
    body: `# 12-Layer Risk Framework

## Filosofi

Risk management bukan fitur tambahan — ini adalah core product. Setiap sinyal yang dikirim sudah melewati 12 lapisan proteksi sebelum sampai ke subscriber.

## Layer 1-4: Pre-Signal Filters

1. **Confidence Threshold** — Sinyal dibawah 0.65 di-reject otomatis
2. **Volatility Check** — ATR harus dalam range normal (tidak ada news spike)
3. **Correlation Filter** — Maksimal 3 posisi pada correlated pairs (EUR/USD, GBP/USD, EUR/GBP)
4. **Session Timing** — Tidak ada sinyal 30 menit sebelum/sesudah major news

## Layer 5-8: Position Management

5. **Dynamic Position Sizing** — Kelly Criterion modified, max 2% per trade
6. **Daily Loss Limit** — Trading stop setelah -3% daily drawdown
7. **Weekly Loss Limit** — Reduced sizing setelah -5% weekly drawdown
8. **Concurrent Position Limit** — Maksimal 5 posisi aktif simultaneously

## Layer 9-12: Recovery & Circuit Breakers

9. **Drawdown Circuit Breaker** — Full stop setelah -8% monthly drawdown
10. **Win Rate Monitor** — Alert jika win rate turun dibawah 55% (20 trade rolling)
11. **Slippage Detector** — Flag jika average slippage > 2 pips
12. **System Health Check** — Auto-pause jika VPS latency > 500ms

## Mengapa 12 Layer?

Setiap layer mengurangi risk sedikit, tapi secara kumulatif menghasilkan perlindungan yang robust. Redundansi adalah kunci — jika satu layer gagal, yang lain tetap berjalan.`,
    body_en: `# 12-Layer Risk Framework

## Philosophy

Risk management is not an add-on feature — it is the core product. Every signal sent has already passed through 12 protection layers before reaching subscribers.

## Layers 1-4: Pre-Signal Filters

1. **Confidence Threshold** — Signals below 0.65 are auto-rejected
2. **Volatility Check** — ATR must be within normal range (no news spikes)
3. **Correlation Filter** — Maximum 3 positions on correlated pairs (EUR/USD, GBP/USD, EUR/GBP)
4. **Session Timing** — No signals 30 minutes before/after major news

## Layers 5-8: Position Management

5. **Dynamic Position Sizing** — Modified Kelly Criterion, max 2% per trade
6. **Daily Loss Limit** — Trading stops after -3% daily drawdown
7. **Weekly Loss Limit** — Reduced sizing after -5% weekly drawdown
8. **Concurrent Position Limit** — Maximum 5 active positions simultaneously

## Layers 9-12: Recovery & Circuit Breakers

9. **Drawdown Circuit Breaker** — Full stop after -8% monthly drawdown
10. **Win Rate Monitor** — Alert if win rate drops below 55% (20 trade rolling)
11. **Slippage Detector** — Flag if average slippage > 2 pips
12. **System Health Check** — Auto-pause if VPS latency > 500ms

## Why 12 Layers?

Each layer reduces risk incrementally, but cumulatively produces robust protection. Redundancy is key — if one layer fails, others continue operating.`,
    category: 'RISK',
    author: 'BabahAlgo Research Desk',
    readTime: 7,
  },
  {
    slug: 'backtest-vs-live-gap',
    title: 'Backtest vs Live: Mengapa Hasilnya Berbeda',
    title_en: 'Backtest vs Live: Why Results Differ',
    excerpt: 'Slippage, spread variation, execution latency, dan requotes. Gap antara backtest dan live trading itu nyata — begini cara kami mengatasinya.',
    excerpt_en: 'Slippage, spread variation, execution latency, and requotes. The gap between backtest and live results is real — here\'s how we handle it.',
    body: `# Backtest vs Live: The Reality Gap

## Data Kami

Setelah 12 bulan operasi, kami memiliki data yang cukup untuk mengukur gap antara backtest dan live performance:

| Metric | Backtest | Live | Gap |
|--------|:---:|:---:|:---:|
| Win Rate | 78% | 73% | -5% |
| Avg Profit/Trade | 2.1% | 1.7% | -0.4% |
| Max Drawdown | 5.2% | 6.8% | +1.6% |
| Sharpe Ratio | 2.4 | 1.9 | -0.5 |

## Penyebab Gap

### 1. Slippage (40% dari gap)
Backtest mengasumsikan fill price = signal price. Realita: average slippage 1.2 pips pada major pairs, 2.5 pips pada exotic pairs.

### 2. Spread Variation (25% dari gap)
Spread melebar signifikan saat:
- Asian session open (2-3x normal)
- Major news events (5-10x normal)
- Low liquidity periods (Friday 21:00+)

### 3. Execution Latency (20% dari gap)
Signal generation → subscriber notification → order execution = 3-15 detik delay. Pada fast-moving markets, ini signifikan.

### 4. Requotes & Rejection (15% dari gap)
Rata-rata 3% dari order mengalami requote atau partial fill.

## Solusi Kami

1. **Conservative backtest assumptions** — Kami menambahkan 2 pip slippage ke setiap backtest
2. **Spread filter** — Sinyal di-hold jika spread > 2x normal
3. **Instant execution** — Telegram notification < 500ms dari signal generation
4. **Position sizing adjustment** — Live sizing 80% dari backtest optimal`,
    body_en: `# Backtest vs Live: The Reality Gap

## Our Data

After 12 months of operation, we have sufficient data to measure the gap between backtest and live performance:

| Metric | Backtest | Live | Gap |
|--------|:---:|:---:|:---:|
| Win Rate | 78% | 73% | -5% |
| Avg Profit/Trade | 2.1% | 1.7% | -0.4% |
| Max Drawdown | 5.2% | 6.8% | +1.6% |
| Sharpe Ratio | 2.4 | 1.9 | -0.5 |

## Causes of the Gap

### 1. Slippage (40% of gap)
Backtests assume fill price = signal price. Reality: average slippage 1.2 pips on major pairs, 2.5 pips on exotic pairs.

### 2. Spread Variation (25% of gap)
Spreads widen significantly during:
- Asian session open (2-3x normal)
- Major news events (5-10x normal)
- Low liquidity periods (Friday 21:00+)

### 3. Execution Latency (20% of gap)
Signal generation → subscriber notification → order execution = 3-15 second delay. In fast-moving markets, this is significant.

### 4. Requotes & Rejection (15% of gap)
On average 3% of orders experience requotes or partial fills.

## Our Solutions

1. **Conservative backtest assumptions** — We add 2 pip slippage to every backtest
2. **Spread filter** — Signals held if spread > 2x normal
3. **Instant execution** — Telegram notification < 500ms from signal generation
4. **Position sizing adjustment** — Live sizing at 80% of backtest optimal`,
    category: 'RESEARCH',
    author: 'BabahAlgo Research Desk',
    readTime: 6,
  },
  {
    slug: 'choosing-broker-quant-framework',
    title: 'Framework Memilih Broker untuk Quant Trading',
    title_en: 'Framework for Choosing a Broker for Quant Trading',
    excerpt: 'Regulasi, kualitas eksekusi, reliabilitas API, dan konsistensi spread. Framework kami untuk mengevaluasi broker.',
    excerpt_en: 'Regulation, execution quality, API reliability, and spread consistency. Our framework for evaluating brokers.',
    body: `# Framework Memilih Broker

## Kriteria Utama

Kami mengevaluasi broker berdasarkan 5 kategori:

### 1. Regulasi & Keamanan (30%)
- Lisensi tier-1 (FCA, ASIC, CySEC)
- Segregated accounts
- Compensation scheme

### 2. Kualitas Eksekusi (25%)
- Average fill time < 50ms
- Slippage rate < 5%
- Requote frequency < 2%

### 3. API & Infrastructure (20%)
- REST/FIX API tersedia
- Uptime > 99.9%
- Rate limit yang memadai

### 4. Spread & Biaya (15%)
- Raw spread pada major pairs
- Commission transparent
- Swap rate kompetitif

### 5. Support & Compliance (10%)
- Dedicated account manager
- Indonesian language support
- Tax reporting tools

## Rekomendasi

Untuk subscriber BabahAlgo, kami merekomendasikan broker dengan API access dan raw spread account. Detail rekomendasi tersedia di portal client.`,
    body_en: `# Broker Selection Framework

## Main Criteria

We evaluate brokers based on 5 categories:

### 1. Regulation & Security (30%)
- Tier-1 license (FCA, ASIC, CySEC)
- Segregated accounts
- Compensation scheme

### 2. Execution Quality (25%)
- Average fill time < 50ms
- Slippage rate < 5%
- Requote frequency < 2%

### 3. API & Infrastructure (20%)
- REST/FIX API available
- Uptime > 99.9%
- Adequate rate limits

### 4. Spread & Costs (15%)
- Raw spread on major pairs
- Transparent commission
- Competitive swap rates

### 5. Support & Compliance (10%)
- Dedicated account manager
- Indonesian language support
- Tax reporting tools

## Recommendation

For BabahAlgo subscribers, we recommend brokers with API access and raw spread accounts. Detailed recommendations available in the client portal.`,
    category: 'OPERATIONS',
    author: 'BabahAlgo Research Desk',
    readTime: 5,
  },
];

async function main() {
  console.log('Seeding articles...');

  for (const a of articles) {
    const article = await prisma.article.upsert({
      where: { slug: a.slug },
      create: {
        ...a,
        isPublished: true,
        publishedAt: new Date(),
      },
      update: {
        title: a.title,
        title_en: a.title_en,
        excerpt: a.excerpt,
        excerpt_en: a.excerpt_en,
        body: a.body,
        body_en: a.body_en,
        category: a.category,
        author: a.author,
        readTime: a.readTime,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    console.log(`  ✓ ${article.slug} (${article.category})`);
  }

  console.log(`\nSeeded ${articles.length} articles (all published).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
