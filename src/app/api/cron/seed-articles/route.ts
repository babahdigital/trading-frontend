import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { ArticleCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && header === expected;
}

const articles: Array<{
  slug: string;
  title: string;
  title_en: string;
  excerpt: string;
  excerpt_en: string;
  body: string;
  body_en: string;
  category: ArticleCategory;
  author: string;
  readTime: number;
}> = [
  {
    slug: 'weekly-recap-2026-04-14',
    title: 'Weekly Research Recap — 14 Apr to 18 Apr 2026',
    title_en: 'Weekly Research Recap — Apr 14 to Apr 18, 2026',
    excerpt: 'Rangkuman 23 sinyal minggu ini, top pair XAUUSD dengan confidence rata-rata 0.82. Distribusi H4 mendominasi phase minggu ini.',
    excerpt_en: 'Summary of 23 signals this week, top pair XAUUSD with average confidence 0.82. H4 distribution dominated this week\'s phase.',
    body: `# Weekly Research Recap\n\n**Period:** 14 April – 18 April 2026\n\n**Total signals:** 23\n**Top pair:** XAUUSD\n**Average confidence:** 0.82\n\n## Market Overview\n\nMinggu ini didominasi oleh fase distribusi pada timeframe H4, terutama pada pair-pair major. XAUUSD menjadi pair paling aktif dengan 8 sinyal, diikuti oleh BTCUSD (5 sinyal) dan EURUSD (4 sinyal).\n\n## Highlights\n\n- **XAUUSD** — 8 sinyal dengan win rate 75%. Fase distribusi H4 memberikan entry optimal pada M15 setelah liquidity sweep di level 2,380.\n- **BTCUSD** — 5 sinyal, mayoritas SELL. BOS bearish pada H1 terkonfirmasi dengan volume declining. Target 62,000 tercapai 3 dari 5 sinyal.\n- **EURUSD** — 4 sinyal mixed. Consolidation range 1.0850-1.0920 memberikan scalping opportunity pada kedua arah.\n- **GBPJPY** — 3 sinyal SELL. Wyckoff distribution pada H4 dengan spring event teridentifikasi di 191.50.\n\n## Key Observations\n\n1. **SMC Entry dominasi** — 78% sinyal menggunakan Smart Money Concept entry, menunjukkan institutional flow yang kuat.\n2. **Confidence threshold** — Sinyal dengan confidence > 0.80 memiliki win rate 85%, sementara 0.70-0.80 hanya 62%.\n3. **Timeframe correlation** — H4 distribution + H1 BOS bearish + M15 bias bearish menghasilkan setup paling reliable minggu ini.\n\n## Risk Notes\n\nVolatilitas meningkat menjelang FOMC statement minggu depan. Posisi sizing telah disesuaikan dari 2% menjadi 1.5% per trade untuk mengantisipasi gap risk.`,
    body_en: `# Weekly Research Recap\n\n**Period:** April 14 – April 18, 2026\n\n**Total signals:** 23\n**Top pair:** XAUUSD\n**Average confidence:** 0.82\n\n## Market Overview\n\nThis week was dominated by distribution phases on the H4 timeframe, particularly on major pairs. XAUUSD was the most active pair with 8 signals, followed by BTCUSD (5 signals) and EURUSD (4 signals).\n\n## Highlights\n\n- **XAUUSD** — 8 signals with 75% win rate. H4 distribution phase provided optimal M15 entries after liquidity sweep at the 2,380 level.\n- **BTCUSD** — 5 signals, majority SELL. Bearish BOS on H1 confirmed with declining volume. Target 62,000 reached on 3 of 5 signals.\n- **EURUSD** — 4 mixed signals. Consolidation range 1.0850-1.0920 provided scalping opportunities in both directions.\n- **GBPJPY** — 3 SELL signals. Wyckoff distribution on H4 with spring event identified at 191.50.\n\n## Key Observations\n\n1. **SMC Entry dominance** — 78% of signals used Smart Money Concept entries, indicating strong institutional flow.\n2. **Confidence threshold** — Signals with confidence > 0.80 had 85% win rate, while 0.70-0.80 only achieved 62%.\n3. **Timeframe correlation** — H4 distribution + H1 bearish BOS + M15 bearish bias produced the most reliable setups this week.\n\n## Risk Notes\n\nVolatility increasing ahead of next week's FOMC statement. Position sizing adjusted from 2% to 1.5% per trade to anticipate gap risk.`,
    category: 'RESEARCH' as ArticleCategory,
    author: 'BabahAlgo Research Desk',
    readTime: 5,
  },
  {
    slug: 'weekly-recap-2026-04-07',
    title: 'Weekly Research Recap — 7 Apr to 11 Apr 2026',
    title_en: 'Weekly Research Recap — Apr 7 to Apr 11, 2026',
    excerpt: 'Rangkuman 18 sinyal minggu ini, top pair BTCUSD dengan confidence rata-rata 0.79. Accumulation phase teridentifikasi pada crypto pairs.',
    excerpt_en: 'Summary of 18 signals this week, top pair BTCUSD with average confidence 0.79. Accumulation phase identified on crypto pairs.',
    body: `# Weekly Research Recap\n\n**Period:** 7 April – 11 April 2026\n\n**Total signals:** 18\n**Top pair:** BTCUSD\n**Average confidence:** 0.79\n\n## Highlights\n\n- **BTCUSD** — 7 sinyal dengan dominasi BUY. Wyckoff accumulation phase pada H4, spring event di 59,800 memberikan entry optimal. Target 64,000 tercapai.\n- **XAUUSD** — 4 sinyal SELL. Distribution phase berlanjut dengan BOS bearish pada H1. Resistance 2,400 bertahan kuat.\n- **USDJPY** — 3 sinyal BUY. Trend continuation bullish setelah break structure di 152.80.\n- **EURUSD** — 2 sinyal ranging. Market consolidation menjelang ECB meeting.\n\n## Performance\n\nWin rate keseluruhan: 72% (13/18)\nAverage R:R realized: 1.8:1\nBest performer: BTCUSD accumulation longs (+4.2%)`,
    body_en: `# Weekly Research Recap\n\n**Period:** April 7 – April 11, 2026\n\n**Total signals:** 18\n**Top pair:** BTCUSD\n**Average confidence:** 0.79\n\n## Highlights\n\n- **BTCUSD** — 7 signals with BUY dominance. Wyckoff accumulation phase on H4, spring event at 59,800 provided optimal entry. Target 64,000 reached.\n- **XAUUSD** — 4 SELL signals. Distribution phase continued with bearish BOS on H1. Resistance at 2,400 held strong.\n- **USDJPY** — 3 BUY signals. Bullish trend continuation after break of structure at 152.80.\n- **EURUSD** — 2 ranging signals. Market consolidation ahead of ECB meeting.\n\n## Performance\n\nOverall win rate: 72% (13/18)\nAverage R:R realized: 1.8:1\nBest performer: BTCUSD accumulation longs (+4.2%)`,
    category: 'RESEARCH' as ArticleCategory,
    author: 'BabahAlgo Research Desk',
    readTime: 4,
  },
  {
    slug: 'smc-entry-optimization',
    title: 'Optimasi Entry Smart Money Concept: Dari Teori ke Eksekusi',
    title_en: 'Smart Money Concept Entry Optimization: From Theory to Execution',
    excerpt: 'Bagaimana BabahAlgo mengoptimasi SMC entry dengan multi-timeframe confluence scoring. Data 6 bulan menunjukkan peningkatan win rate 12%.',
    excerpt_en: 'How BabahAlgo optimizes SMC entries with multi-timeframe confluence scoring. 6-month data shows 12% win rate improvement.',
    body: `# Optimasi Entry Smart Money Concept\n\n## Latar Belakang\n\nSmart Money Concept (SMC) telah menjadi framework utama dalam analisis teknikal modern. Di BabahAlgo, kami menggunakan SMC sebagai salah satu dari 6 strategi aktif, namun dengan pendekatan quantitative.\n\n## Metodologi\n\n### Multi-Timeframe Confluence Score\n\nSetiap sinyal SMC melewati 3 filter timeframe:\n\n1. **H4 Phase Detection** — Mengidentifikasi Wyckoff phase\n2. **H1 Structure Break** — Konfirmasi BOS atau ChoCH\n3. **M15 Bias Alignment** — Entry timing berdasarkan order block dan fair value gap\n\n### Confidence Scoring\n\n- Phase alignment across timeframes: 30%\n- Volume confirmation: 20%\n- Order block strength: 25%\n- Historical pair behavior: 15%\n- Session timing: 10%\n\n## Hasil (6 Bulan Terakhir)\n\n| Metric | Sebelum | Setelah |\n|--------|:---:|:---:|\n| Win Rate | 63% | 75% |\n| Avg R:R | 1.5:1 | 2.1:1 |\n| Signals/Week | 35 | 22 |\n| Max Drawdown | 8.2% | 4.7% |\n\nConfluence scoring membantu filter noise dan meningkatkan probability.`,
    body_en: `# Smart Money Concept Entry Optimization\n\n## Background\n\nSmart Money Concept (SMC) has become a primary framework in modern technical analysis. At BabahAlgo, we use SMC as one of 6 active strategies, with a quantitative approach.\n\n## Methodology\n\n### Multi-Timeframe Confluence Score\n\nEach SMC signal passes through 3 timeframe filters:\n\n1. **H4 Phase Detection** — Identifying Wyckoff phases\n2. **H1 Structure Break** — Confirming BOS or ChoCH\n3. **M15 Bias Alignment** — Entry timing based on order blocks and fair value gaps\n\n### Confidence Scoring\n\n- Phase alignment across timeframes: 30%\n- Volume confirmation: 20%\n- Order block strength: 25%\n- Historical pair behavior: 15%\n- Session timing: 10%\n\n## Results (Last 6 Months)\n\n| Metric | Before | After |\n|--------|:---:|:---:|\n| Win Rate | 63% | 75% |\n| Avg R:R | 1.5:1 | 2.1:1 |\n| Signals/Week | 35 | 22 |\n| Max Drawdown | 8.2% | 4.7% |\n\nConfluence scoring helps filter noise and improve probability.`,
    category: 'STRATEGY' as ArticleCategory,
    author: 'BabahAlgo Research Desk',
    readTime: 8,
  },
  {
    slug: 'risk-framework-12-layers',
    title: 'Cara Kerja 12-Layer Risk Framework Kami',
    title_en: 'How Our 12-Layer Risk Framework Works',
    excerpt: 'Dari position sizing hingga correlation filter dan drawdown circuit breaker. Transparansi penuh tentang setiap lapisan proteksi.',
    excerpt_en: 'From position sizing to correlation filters and drawdown circuit breakers. Full transparency on every protection layer.',
    body: `# 12-Layer Risk Framework\n\n## Filosofi\n\nRisk management bukan fitur tambahan — ini adalah core product.\n\n## Layer 1-4: Pre-Signal Filters\n\n1. **Confidence Threshold** — Sinyal dibawah 0.65 di-reject\n2. **Volatility Check** — ATR harus dalam range normal\n3. **Correlation Filter** — Maks 3 posisi pada correlated pairs\n4. **Session Timing** — Tidak ada sinyal 30 menit sebelum/sesudah major news\n\n## Layer 5-8: Position Management\n\n5. **Dynamic Position Sizing** — Kelly Criterion modified, max 2% per trade\n6. **Daily Loss Limit** — Stop setelah -3% daily drawdown\n7. **Weekly Loss Limit** — Reduced sizing setelah -5% weekly drawdown\n8. **Concurrent Position Limit** — Maks 5 posisi aktif\n\n## Layer 9-12: Recovery & Circuit Breakers\n\n9. **Drawdown Circuit Breaker** — Full stop setelah -8% monthly drawdown\n10. **Win Rate Monitor** — Alert jika win rate < 55%\n11. **Slippage Detector** — Flag jika avg slippage > 2 pips\n12. **System Health Check** — Auto-pause jika VPS latency > 500ms`,
    body_en: `# 12-Layer Risk Framework\n\n## Philosophy\n\nRisk management is not an add-on — it is the core product.\n\n## Layers 1-4: Pre-Signal Filters\n\n1. **Confidence Threshold** — Signals below 0.65 auto-rejected\n2. **Volatility Check** — ATR must be in normal range\n3. **Correlation Filter** — Max 3 positions on correlated pairs\n4. **Session Timing** — No signals 30 min before/after major news\n\n## Layers 5-8: Position Management\n\n5. **Dynamic Position Sizing** — Modified Kelly Criterion, max 2% per trade\n6. **Daily Loss Limit** — Stop after -3% daily drawdown\n7. **Weekly Loss Limit** — Reduced sizing after -5% weekly drawdown\n8. **Concurrent Position Limit** — Max 5 active positions\n\n## Layers 9-12: Recovery & Circuit Breakers\n\n9. **Drawdown Circuit Breaker** — Full stop after -8% monthly drawdown\n10. **Win Rate Monitor** — Alert if win rate < 55%\n11. **Slippage Detector** — Flag if avg slippage > 2 pips\n12. **System Health Check** — Auto-pause if VPS latency > 500ms`,
    category: 'RISK' as ArticleCategory,
    author: 'BabahAlgo Research Desk',
    readTime: 7,
  },
  {
    slug: 'backtest-vs-live-gap',
    title: 'Backtest vs Live: Mengapa Hasilnya Berbeda',
    title_en: 'Backtest vs Live: Why Results Differ',
    excerpt: 'Slippage, spread variation, execution latency, dan requotes. Gap antara backtest dan live trading itu nyata — begini cara kami mengatasinya.',
    excerpt_en: 'Slippage, spread variation, execution latency, and requotes. The gap between backtest and live results is real — here\'s how we handle it.',
    body: `# Backtest vs Live: The Reality Gap\n\n## Data Kami\n\n| Metric | Backtest | Live | Gap |\n|--------|:---:|:---:|:---:|\n| Win Rate | 78% | 73% | -5% |\n| Avg Profit/Trade | 2.1% | 1.7% | -0.4% |\n| Max Drawdown | 5.2% | 6.8% | +1.6% |\n| Sharpe Ratio | 2.4 | 1.9 | -0.5 |\n\n## Penyebab Gap\n\n### 1. Slippage (40%)\nBacktest mengasumsikan fill price = signal price. Realita: average slippage 1.2 pips.\n\n### 2. Spread Variation (25%)\nSpread melebar saat Asian session open, major news, dan low liquidity.\n\n### 3. Execution Latency (20%)\nSignal → notification → execution = 3-15 detik delay.\n\n### 4. Requotes & Rejection (15%)\nRata-rata 3% order mengalami requote.\n\n## Solusi Kami\n\n1. **Conservative backtest** — +2 pip slippage\n2. **Spread filter** — Hold jika spread > 2x normal\n3. **Instant execution** — Telegram < 500ms\n4. **Position sizing** — Live 80% dari backtest optimal`,
    body_en: `# Backtest vs Live: The Reality Gap\n\n## Our Data\n\n| Metric | Backtest | Live | Gap |\n|--------|:---:|:---:|:---:|\n| Win Rate | 78% | 73% | -5% |\n| Avg Profit/Trade | 2.1% | 1.7% | -0.4% |\n| Max Drawdown | 5.2% | 6.8% | +1.6% |\n| Sharpe Ratio | 2.4 | 1.9 | -0.5 |\n\n## Causes\n\n### 1. Slippage (40%)\nBacktests assume fill price = signal price. Reality: avg 1.2 pips slippage.\n\n### 2. Spread Variation (25%)\nSpreads widen during Asian open, news events, low liquidity.\n\n### 3. Execution Latency (20%)\nSignal → notification → execution = 3-15 sec delay.\n\n### 4. Requotes (15%)\nAverage 3% of orders get requotes.\n\n## Solutions\n\n1. **Conservative backtest** — +2 pip slippage assumed\n2. **Spread filter** — Hold if spread > 2x normal\n3. **Instant execution** — Telegram < 500ms\n4. **Position sizing** — Live at 80% of backtest optimal`,
    category: 'RESEARCH' as ArticleCategory,
    author: 'BabahAlgo Research Desk',
    readTime: 6,
  },
  {
    slug: 'choosing-broker-quant-framework',
    title: 'Framework Memilih Broker untuk Quant Trading',
    title_en: 'Framework for Choosing a Broker for Quant Trading',
    excerpt: 'Regulasi, kualitas eksekusi, reliabilitas API, dan konsistensi spread. Framework kami untuk mengevaluasi broker.',
    excerpt_en: 'Regulation, execution quality, API reliability, and spread consistency. Our framework for evaluating brokers.',
    body: `# Framework Memilih Broker\n\n## Kriteria Utama\n\n### 1. Regulasi & Keamanan (30%)\n- Lisensi tier-1 (FCA, ASIC, CySEC)\n- Segregated accounts\n- Compensation scheme\n\n### 2. Kualitas Eksekusi (25%)\n- Average fill time < 50ms\n- Slippage rate < 5%\n- Requote frequency < 2%\n\n### 3. API & Infrastructure (20%)\n- REST/FIX API tersedia\n- Uptime > 99.9%\n- Rate limit memadai\n\n### 4. Spread & Biaya (15%)\n- Raw spread pada major pairs\n- Commission transparent\n- Swap rate kompetitif\n\n### 5. Support & Compliance (10%)\n- Dedicated account manager\n- Indonesian language support\n- Tax reporting tools`,
    body_en: `# Broker Selection Framework\n\n## Main Criteria\n\n### 1. Regulation & Security (30%)\n- Tier-1 license (FCA, ASIC, CySEC)\n- Segregated accounts\n- Compensation scheme\n\n### 2. Execution Quality (25%)\n- Average fill time < 50ms\n- Slippage rate < 5%\n- Requote frequency < 2%\n\n### 3. API & Infrastructure (20%)\n- REST/FIX API available\n- Uptime > 99.9%\n- Adequate rate limits\n\n### 4. Spread & Costs (15%)\n- Raw spread on major pairs\n- Transparent commission\n- Competitive swap rates\n\n### 5. Support & Compliance (10%)\n- Dedicated account manager\n- Indonesian language support\n- Tax reporting tools`,
    category: 'OPERATIONS' as ArticleCategory,
    author: 'BabahAlgo Research Desk',
    readTime: 5,
  },
];

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const results: string[] = [];
  for (const a of articles) {
    const article = await prisma.article.upsert({
      where: { slug: a.slug },
      create: { ...a, isPublished: true, publishedAt: new Date() },
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
    results.push(`${article.slug} (${article.category})`);
  }

  return NextResponse.json({ status: 'ok', seeded: results.length, articles: results });
}

export const POST = GET;
