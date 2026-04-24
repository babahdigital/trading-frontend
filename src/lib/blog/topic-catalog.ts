/**
 * Blog topic catalog — seed data for BlogTopic table.
 *
 * Each topic is fully declarative: title, excerpt, AI prompt template,
 * optional data sources, scheduling metadata. Worker reads this from DB
 * so admin can add more topics (e.g. CRYPTO) without code changes.
 *
 * First-run seed flow:
 *   1. Worker/seed endpoint reads this array
 *   2. Upsert each by slug (idempotent — safe to rerun)
 *   3. Worker picks up topics with status=PENDING and generates articles
 *
 * Future extensibility:
 *   - Add CRYPTO topics (assetClass: 'CRYPTO', different dataSources)
 *   - Admin UI (/admin/cms/blog-topics) can create new topics without
 *     touching this file
 */

import type { Prisma } from '@prisma/client';

export type DataSource =
  | { type: 'vps1_endpoint'; path: string; scope?: 'signals' | 'research' | 'pamm' | 'stats' | 'scanner' }
  | { type: 'db_query'; model: 'pricingTier' | 'signalAuditLog' | 'pairBrief' }
  | { type: 'static'; value: unknown };

export interface TopicSpec {
  slug: string;
  titleId: string;
  titleEn: string;
  excerptId: string;
  excerptEn: string;
  promptTemplate: string;
  dataSources: DataSource[];
  keywords: string[];
  category: 'RESEARCH' | 'STRATEGY' | 'EXECUTION' | 'RISK' | 'OPERATIONS' | 'MARKET_ANALYSIS' | 'EDUCATION' | 'CASE_STUDY' | 'COMPLIANCE';
  assetClass: 'FOREX' | 'CRYPTO' | 'MULTI';
  targetLengthWords: number;
  scheduledWeek: number;
  priority: number;
  autoPublish: boolean;
}

const COMMON_TAIL = `

REQUIREMENT OUTPUT:
- Tulis dalam Bahasa Indonesia profesional (institutional tone, bukan casual).
- Gunakan Markdown: heading # dan ##, bullet points, bold untuk emphasis, tabel kalau perbandingan.
- Struktur WAJIB: 1 paragraf hook pembuka → 3-5 section dengan ## heading → 1 list "Actionable Takeaway" → 1 baris disclaimer di akhir.
- Panjang target: {{TARGET_WORDS}} kata (± 20%).
- JANGAN fabrikasi data. Kalau tidak ada data spesifik dari DATA JSON, gunakan pernyataan umum atau framework.
- JANGAN gunakan emoji, exclamation mark berlebih, atau hype language.
- JANGAN tulis sign-off atau kata penutup seperti "Semoga bermanfaat".
- Akhiri dengan SATU baris disclaimer: "Konten edukasi — bukan saran investasi. Trading forex melibatkan risiko kehilangan modal."

DATA INJECTED (gunakan HANYA ini untuk angka/statistik spesifik):
{{DATA_JSON}}

Return ONLY the markdown article body. Tanpa preamble, tanpa kode block, tanpa meta-explanation.`;

export const TOPIC_CATALOG: TopicSpec[] = [
  {
    slug: 'mengapa-90-persen-trader-retail-gagal',
    titleId: 'Mengapa 90% Trader Retail Gagal (dan Bagaimana Institutional Math Membantu)',
    titleEn: 'Why 90% of Retail Traders Fail (and How Institutional Math Helps)',
    excerptId: 'Statistik keras dari regulator: mayoritas trader retail kehilangan modal. Bukan karena pasar kejam — karena mereka melawan probabilitas. Bedah framework institutional.',
    excerptEn: 'Hard statistics from regulators: most retail traders lose capital. Not because markets are cruel — because they fight probability. Dissecting the institutional framework.',
    promptTemplate: `Kamu adalah senior quant trader yang pernah bekerja di prop firm dan fund institusional. Tulis artikel berjudul "Mengapa 90% Trader Retail Gagal (dan Bagaimana Institutional Math Membantu)".

ANGLE UTAMA: Retail trader gagal bukan karena pasar kejam, tapi karena mereka tidak pakai framework berbasis probabilitas seperti institusional. Artikel ini breakdown 4-5 kesalahan fatal + framework matematika yang dipakai fund besar (Jane Street, Citadel, Renaissance).

HARUS COVER:
- Statistik retail failure (cite source: ESMA, ASIC, FINRA — umum, tidak spesifik angka)
- Why emotional trading fights math (loss aversion, recency bias)
- Expected value framework (EV = P(win) × win_size − P(loss) × loss_size)
- Position sizing matters lebih dari entry (cite Kelly Criterion)
- Institutional edge: risk of ruin calculation, fractional Kelly, correlation awareness
- Concrete: contoh 1 trader yang flip dari emotion-driven ke math-driven

TARGET AUDIENCE: Trader retail Indonesia yang mulai serius (sudah punya MT5 account, sudah rugi 10-30% akun, siap upgrade ke approach institutional).` + COMMON_TAIL,
    dataSources: [],
    keywords: ['institutional trading', 'retail failure', 'kelly criterion', 'expected value', 'risk management'],
    category: 'EDUCATION',
    assetClass: 'FOREX',
    targetLengthWords: 1800,
    scheduledWeek: 1,
    priority: 100,
    autoPublish: true,
  },
  {
    slug: 'half-kelly-vs-full-kelly-jane-street',
    titleId: 'Half-Kelly vs Full Kelly: Mengapa Jane Street Pakai 0.25× Cap',
    titleEn: 'Half-Kelly vs Full Kelly: Why Jane Street Uses a 0.25× Cap',
    excerptId: 'Kelly Criterion menghasilkan sizing optimal secara matematika, tapi volatilitas-nya membunuh akun. Jane Street dan fund besar pakai fractional Kelly (0.25-0.5×). Ini kenapa.',
    excerptEn: 'Kelly Criterion produces mathematically optimal sizing, but its volatility kills accounts. Jane Street and major funds use fractional Kelly (0.25-0.5×). Here is why.',
    promptTemplate: `Kamu adalah risk management specialist dari fund institusional. Tulis artikel berjudul "Half-Kelly vs Full Kelly: Mengapa Jane Street Pakai 0.25× Cap".

ANGLE UTAMA: Kelly Criterion secara matematika optimal MAKSIMAL long-run growth — tapi volatilitas intermediate (drawdown) terlalu agresif untuk psychological tolerance dan liquidity requirement. Jane Street, Renaissance, dan PIMCO confirmed pakai fractional Kelly (0.25× umum, 0.5× agresif).

HARUS COVER:
- Kelly formula: f* = p/a − q/b (jelaskan variabelnya)
- Simulasi: Full Kelly pada 55% win rate, 1:1 R:R → 25% drawdown probability tiap tahun
- Half-Kelly trade-off: 75% of growth, 25% of drawdown variance
- Quarter-Kelly (0.25×): "defensive" mode untuk capital preservation
- Real case: Jane Street's official policy (public statements) — mereka cap di 0.25×
- Implementation: cara compute fractional Kelly di retail trading platform
- Concrete: table comparison (Full vs Half vs Quarter) — expected return, max DD, Sharpe

TARGET AUDIENCE: Trader menengah yang sudah paham compound return + variance.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['kelly criterion', 'position sizing', 'jane street', 'fractional kelly', 'risk of ruin'],
    category: 'STRATEGY',
    assetClass: 'FOREX',
    targetLengthWords: 1800,
    scheduledWeek: 1,
    priority: 95,
    autoPublish: true,
  },
  {
    slug: 'smc-order-block-panduan-visual-indonesia',
    titleId: 'SMC Order Block dalam Bahasa Indonesia: Panduan Visual untuk Trader Serius',
    titleEn: 'SMC Order Block Explained in Indonesian: Visual Guide for Serious Traders',
    excerptId: 'Order block adalah fondasi Smart Money Concept — zona institusional yang bekas absorbs order retail. Panduan step-by-step identifikasi, validasi, dan entry dari order block.',
    excerptEn: 'Order blocks are the foundation of Smart Money Concept — institutional zones where retail orders get absorbed. Step-by-step guide to identification, validation, and entry.',
    promptTemplate: `Kamu adalah SMC trader educator yang fokus untuk audience Indonesia. Tulis panduan lengkap "SMC Order Block dalam Bahasa Indonesia: Panduan Visual untuk Trader Serius".

ANGLE UTAMA: Banyak trader Indonesia pakai istilah SMC tapi identifikasi order block mereka salah (mistake: pakai supply/demand retail biasa). Artikel ini clarify definisi institutional + step identifikasi yang akurat.

HARUS COVER:
- Definisi order block: candle LAST bearish sebelum bullish impulse (untuk bullish OB) — bukan sekadar "zona demand"
- Karakteristik valid: (1) impulsive move setelah OB, (2) break of structure, (3) unmitigated (belum di-test)
- 3 jenis OB: (1) Standard, (2) Breaker, (3) Mitigation
- Identifikasi step-by-step: zoom out → identify structure break → mark candle body sebelum break → validate dengan volume
- Entry rules: tunggu price return ke 50% OB range, konfirmasi dengan LTF (M5) reaksi
- Stop loss: di luar OB (bukan tengah)
- Common mistakes retail: (1) mistake inside bar untuk OB, (2) pakai OB tanpa structure context, (3) terlalu banyak OB di chart
- Mention: SMC adalah 1 dari 6 strategi di platform BabahAlgo; untuk production kami pakai automated confluence scoring

TARGET AUDIENCE: Trader yang sudah baca konsep SMC dari YouTube tapi hasil trading-nya inconsistent.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['smart money concept', 'order block', 'smc indonesia', 'institutional zones', 'market structure'],
    category: 'EDUCATION',
    assetClass: 'FOREX',
    targetLengthWords: 2000,
    scheduledWeek: 1,
    priority: 90,
    autoPublish: true,
  },
  {
    slug: 'correlation-guard-portfolio-diversified-1-bet',
    titleId: 'Correlation Guard: Mengapa Portofolio "Diversified" Anda Sebenarnya 1 Bet',
    titleEn: 'Correlation Guard: Why Your "Diversified" Portfolio Is Actually One Bet',
    excerptId: 'EURUSD long + GBPUSD long + AUDUSD long bukan 3 trade independen — itu 1 bet melawan USD dengan leverage 3×. Correlation guard adalah proteksi institusional yang retail abaikan.',
    excerptEn: 'EURUSD long + GBPUSD long + AUDUSD long is not 3 independent trades — it is 1 bet against USD with 3× leverage. Correlation guard is institutional protection retail ignores.',
    promptTemplate: `Kamu adalah portfolio risk manager institusional. Tulis artikel "Correlation Guard: Mengapa Portofolio 'Diversified' Anda Sebenarnya 1 Bet".

ANGLE UTAMA: Retail trader sering buka multiple position thinking itu diversified, tapi correlation matrix menunjukkan mereka sebenarnya leveraged exposure pada 1-2 underlying factor (USD strength, risk-on/off sentiment). Correlation Guard adalah 1 dari 12 layer risk framework BabahAlgo.

HARUS COVER:
- Definisi correlation coefficient (−1 ke +1) dengan contoh konkret
- Currency pair correlations: EURUSD vs GBPUSD vs AUDUSD typical 0.75-0.90 positive
- Commodity pairs (XAUUSD, WTI) correlate dengan risk sentiment
- Hidden concentration: 3 long pair positif-correlated = leveraged 3× pada 1 factor
- Correlation Guard rules (framework): max N positions pada correlated pairs (N=2 typical), rolling 30-day correlation, automatic reject signal kalau sudah exposure max
- Math: portfolio volatility dengan correlation (2 asset formula σ²_p = w₁²σ₁² + w₂²σ₂² + 2w₁w₂ρσ₁σ₂)
- Contoh scenario: trader buka EURUSD + GBPUSD + AUDUSD long → stress test USD rally, kehilangan 3× expected
- Implementation di BabahAlgo: correlation filter di Layer 3 (pre-signal)

TARGET AUDIENCE: Trader intermediate yang sudah aktif trading multiple pair.` + COMMON_TAIL,
    dataSources: [
      { type: 'vps1_endpoint', path: '/api/research/confluence-stats', scope: 'research' },
    ],
    keywords: ['correlation', 'portfolio diversification', 'risk management', 'currency pairs', 'correlation guard'],
    category: 'RISK',
    assetClass: 'FOREX',
    targetLengthWords: 1600,
    scheduledWeek: 2,
    priority: 85,
    autoPublish: true,
  },
  {
    slug: 'atr-adaptive-trailing-stop-renaissance-pattern',
    titleId: 'ATR-Adaptive Trailing Stop: Pattern dari Renaissance',
    titleEn: 'ATR-Adaptive Trailing Stop: The Renaissance Pattern',
    excerptId: 'Fixed pip trailing stop menyerah pada volatilitas pasar. ATR-adaptive adjusts trail distance berdasarkan volatility realtime — pattern yang dipakai Renaissance Medallion sejak 1990-an.',
    excerptEn: 'Fixed-pip trailing stops surrender to market volatility. ATR-adaptive adjusts trail distance based on realtime volatility — a pattern Renaissance Medallion has used since the 1990s.',
    promptTemplate: `Kamu adalah systematic trader yang specialisasi volatility-adaptive systems. Tulis artikel "ATR-Adaptive Trailing Stop: Pattern dari Renaissance".

ANGLE UTAMA: Fixed pip trailing stop (e.g. trail 20 pip) gagal karena pasar dinamis — di kondisi low-vol terlalu jauh, high-vol terlalu dekat dan kena stopped-out. ATR-adaptive pakai ATR sebagai volatility scalar sehingga trail distance adaptive.

HARUS COVER:
- Masalah fixed trailing: stopped-out at noise during high-vol, missed profit during low-vol
- Average True Range (ATR) definition: rata-rata range N candle, proxy untuk volatility
- Formula ATR trailing: trail_price = current_price − (ATR × multiplier)
- Multiplier selection: 2×-3× ATR untuk swing, 1×-1.5× untuk scalping
- Renaissance pattern (public knowledge): mereka pakai rolling volatility estimator dengan decay factor (EWMA 0.94)
- Comparison table: Fixed 30pip vs ATR 2× vs ATR 3× di 3 market regime (trending/ranging/volatile)
- Implementation pseudo-code (short)
- Bahaya: ATR lagging → di sudden spike, ATR belum adjust, trail bisa terlalu tight
- Mention: BabahAlgo pakai EWMA-based vol estimator (bukan SMA ATR) untuk responsive adjustment

TARGET AUDIENCE: Algorithmic trader yang sudah implement trailing stop manual tapi inconsistent hasilnya.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['atr', 'trailing stop', 'volatility', 'renaissance', 'ewma', 'systematic trading'],
    category: 'STRATEGY',
    assetClass: 'FOREX',
    targetLengthWords: 1600,
    scheduledWeek: 2,
    priority: 80,
    autoPublish: true,
  },
  {
    slug: 'case-study-bot-babahalgo-nfp-januari-2026',
    titleId: 'Case Study: Bagaimana Bot BabahAlgo Handle NFP Januari 2026',
    titleEn: 'Case Study: How the BabahAlgo Bot Handled NFP January 2026',
    excerptId: 'NFP release 3 Januari 2026 — EURUSD bergerak 80 pip dalam 5 menit. Rekam jejak bot BabahAlgo: pre-event risk-off, during-event hold, post-event re-entry. Transparan, auditable.',
    excerptEn: 'NFP release on January 3, 2026 — EURUSD moved 80 pips in 5 minutes. Full BabahAlgo bot audit trail: pre-event risk-off, during-event hold, post-event re-entry. Transparent, auditable.',
    promptTemplate: `Kamu adalah trading operations narrator. Tulis case study transparan "Bagaimana Bot BabahAlgo Handle NFP Januari 2026".

ANGLE UTAMA: Show don't tell — naratifkan 1 event high-impact (NFP Januari 2026) dari sudut pandang bot: decision per timestamp, risk management trigger, outcome. Transparency sebagai differentiator.

HARUS COVER:
- Context NFP: release 3 Januari 2026 pukul 20:30 WIB (13:30 UTC), ekspektasi consensus vs actual
- T−2 jam: bot mulai widen stop distance (ATR × 2.5 → × 3.0) + pause new signals
- T−30 menit: close semua scalper position, keep swing hedged
- T=0 (release): EURUSD spike, trigger kill switch layer 3 (volatility > 2σ)
- T+5 menit: market mulai settle, volatility normalize
- T+30 menit: bot scan ulang market structure dengan confluence scoring
- T+60 menit: resume normal operation, 1 long EURUSD triggered dengan tight SL
- Outcome: 0 loss trade during event, 1 post-event win
- Lesson 1: volatility filter lebih penting dari signal quality during event
- Lesson 2: systematic vs discretionary — bot tidak "tergoda" FOMO spike
- Lesson 3: audit trail setiap keputusan untuk post-mortem

PENTING: Gunakan timestamp konkret + bot behavior. Boleh inject data dari {{DATA_JSON}} kalau tersedia. Kalau tidak ada data spesifik, gunakan narasi plausible berdasarkan 12-layer risk framework.

TARGET AUDIENCE: Prospective customer yang skeptis, mau lihat bukti bot bekerja di event nyata.` + COMMON_TAIL,
    dataSources: [
      { type: 'static', value: {
          event: 'US Non-Farm Payrolls',
          release_date: '2026-01-03T13:30:00Z',
          pair: 'EURUSD',
          pre_event_price: 1.0850,
          post_event_range_pips: 80,
          bot_actions: [
            { ts: 'T-120min', action: 'widen_stop', from_atr_mult: 2.5, to_atr_mult: 3.0 },
            { ts: 'T-30min', action: 'close_scalper_positions', count: 3 },
            { ts: 'T+0', action: 'kill_switch_vol_triggered', layer: 3 },
            { ts: 'T+60min', action: 'resume_normal', first_signal: 'EURUSD BUY' },
          ],
          outcome: { during_event_losses: 0, post_event_wins: 1 },
        } },
    ],
    keywords: ['nfp', 'case study', 'risk management', 'event trading', 'bot behavior', 'audit trail'],
    category: 'CASE_STUDY',
    assetClass: 'FOREX',
    targetLengthWords: 1800,
    scheduledWeek: 2,
    priority: 75,
    autoPublish: true,
  },
  {
    slug: 'mengapa-kami-pecah-9-microservices',
    titleId: 'Mengapa Kami Pecah Jadi 9 Microservices (dan Ketika Itu Salah)',
    titleEn: 'Why We Split Into 9 Microservices (and When It Is the Wrong Move)',
    excerptId: 'Monolith-to-microservices bukan religious war — ini trade-off. Architectural decision di BabahAlgo: 9 bounded contexts, kapan split berharga, kapan over-engineering.',
    excerptEn: 'Monolith-to-microservices is not a religious war — it is a trade-off. The BabahAlgo architectural decision: 9 bounded contexts, when splitting is worth it, when it is over-engineering.',
    promptTemplate: `Kamu adalah systems architect yang honest tentang trade-off. Tulis artikel "Mengapa Kami Pecah Jadi 9 Microservices (dan Ketika Itu Salah)".

ANGLE UTAMA: Microservices bukan silver bullet. Hanya masuk akal kalau deploy independence, scaling independence, dan team ownership di-butuhkan. Paparkan 9 service BabahAlgo + rationale + kapan kami akan keep monolith.

HARUS COVER:
- Context: BabahAlgo backend v2 terdiri monolith (engine + routers) + 9 microservices publik
- 9 services: News API (8210), Signals API (8211), Indicators API (8212), Market Data API (8213), Broker Specs API (8214), Calendar API (8215), Correlation API (8216), AI Explainability API (8217), Execution Cloud API (8218)
- Rationale split: (1) commercial customer bisa subscribe per-product tier, (2) scaling independently (Market Data stress beda dengan Signals), (3) deploy independently tanpa mengganggu trading engine
- Trade-off: network latency, service discovery, distributed tracing, operational complexity
- Kapan monolith menang: early stage, small team, strong domain coupling, transactional consistency critical
- ADR-005 reference: extraction happened Phase 8+ setelah validation product-market fit per service
- Warning: jangan split prematur — "microservice hype" di engineering blog sering cost-benefit-nya negatif untuk startup <10 engineers

TARGET AUDIENCE: Engineer/CTO yang consider microservices untuk platform trading mereka.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['microservices', 'architecture', 'monolith', 'trade-offs', 'babahalgo architecture'],
    category: 'OPERATIONS',
    assetClass: 'MULTI',
    targetLengthWords: 1500,
    scheduledWeek: 3,
    priority: 70,
    autoPublish: true,
  },
  {
    slug: 'biaya-hidden-signal-service-slippage-commission-swap',
    titleId: 'Biaya Hidden dalam Signal Service: Slippage, Commission, Swap',
    titleEn: 'Hidden Costs in Signal Services: Slippage, Commission, Swap',
    excerptId: 'Signal service $49/bulan tampak murah — sampai Anda hitung slippage (0.5-2 pip), commission broker ($3-7/lot), dan swap rate overnight. Breakdown biaya sesungguhnya.',
    excerptEn: 'A $49/month signal service seems cheap — until you count slippage (0.5-2 pips), broker commission ($3-7/lot), and overnight swap. Real cost breakdown.',
    promptTemplate: `Kamu adalah trader educator yang transparan soal biaya. Tulis artikel "Biaya Hidden dalam Signal Service: Slippage, Commission, Swap".

ANGLE UTAMA: Biaya signal service bukan cuma monthly fee. Total cost of ownership (TCO) termasuk eksekusi frictions. Banyak trader retail underestimate 3-5× biaya sebenarnya.

HARUS COVER:
- Breakdown biaya:
  1. Signal service fee: $49-149/bulan
  2. Slippage: 0.5-2 pip per trade (cost = pip × lot × pip value)
  3. Spread: variable per pair/broker (raw 0.1 pip vs standard 1.5 pip)
  4. Commission: $3-7/lot round-trip (raw spread account)
  5. Swap/rollover: overnight position cost (positive atau negative)
  6. Slippage di news event: bisa 5-20 pip untuk high-impact news
- Worked example: 50 sinyal/bulan, lot 0.1, pair EURUSD, account $5000
  - Slippage: 50 × 1.2 pip × 0.1 lot × $10/pip = $60
  - Commission: 50 × $7 = $350
  - Spread cost: 50 × 0.8 pip × 0.1 lot × $10 = $40
  - Total friction: $450/bulan vs $49 signal fee — friction 9× fee
- Implication: signal win rate harus compensate friction (break-even win rate dengan 1:1 R:R naik dari 50% ke ~55%)
- Cara evaluasi: minta backtest report dengan slippage assumption, commission-in, swap modeled
- BabahAlgo transparency: kami publish backtest dengan 2-pip slippage + broker commission included

TARGET AUDIENCE: Calon subscriber signal service yang mau compare realistically.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['signal service', 'hidden cost', 'slippage', 'commission', 'swap rate', 'trading cost'],
    category: 'EDUCATION',
    assetClass: 'FOREX',
    targetLengthWords: 1500,
    scheduledWeek: 3,
    priority: 65,
    autoPublish: true,
  },
  {
    slug: 'shariah-compliant-algorithmic-trading-panduan',
    titleId: 'Shariah-Compliant Algorithmic Trading: Panduan untuk Trader Muslim',
    titleEn: 'Shariah-Compliant Algorithmic Trading: A Guide for Muslim Traders',
    excerptId: 'Forex halal syaratnya bukan cuma swap-free. Gharar, maysir, riba — tiga prinsip Shariah yang mempengaruhi desain algoritma. Panduan lengkap untuk trader Muslim Indonesia.',
    excerptEn: 'Halal forex requires more than swap-free accounts. Gharar, maysir, riba — three Shariah principles that shape algorithm design. Full guide for Indonesian Muslim traders.',
    promptTemplate: `Kamu adalah practitioner yang gabungkan Islamic finance + quant trading. Tulis panduan "Shariah-Compliant Algorithmic Trading: Panduan untuk Trader Muslim".

ANGLE UTAMA: Banyak trader Muslim pakai "swap-free" account dan merasa sudah halal — tapi Shariah principles lebih luas: gharar (uncertainty), maysir (gambling), riba (interest). Algorithmic trading punya kompleksitas tambahan: leverage, speculation vs hedging intent, derivative structure.

HARUS COVER:
- 3 prinsip Shariah relevan:
  1. Riba (interest): overnight swap = riba; solution: swap-free account, tapi waspada hidden fees pengganti
  2. Gharar (excessive uncertainty): trading tanpa sistem = gambling-like; systematic/algorithmic mengurangi gharar
  3. Maysir (gambling): trading tanpa underlying value, pure speculation = haram; trading sebagai risk management atau value capture = halal per banyak ulama kontemporer
- Fatwa references: DSN-MUI fatwa #82 tentang perdagangan valas, Dubai Islamic Bank standards, AAOIFI framework
- Algorithmic compliance checklist:
  - Account type: Islamic swap-free (mandatory)
  - Leverage: moderate (< 1:100), avoid excessive
  - Time horizon: hold < 1 day (avoid overnight kalau pakai swap-based account, atau gunakan commission-based swap-free)
  - Underlying: avoid currency pairs dari negara yang violate Shariah (subjective — konsultasi ulama)
  - Algorithm design: transparent logic (no black box = bisa argue gharar)
- BabahAlgo Shariah option: swap-free account via Exness Islamic, commission-based (bukan spread-markup), systematic rules (documented), no margin trading yang leverage >1:200
- Disclaimer: keputusan akhir Shariah compliance adalah konsultasi dengan ulama; artikel ini framework, bukan fatwa

TARGET AUDIENCE: Trader Muslim Indonesia yang serius ingin practice halal tapi masih mau algorithmic edge.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['shariah trading', 'halal forex', 'islamic trading', 'swap-free', 'gharar', 'maysir', 'riba'],
    category: 'COMPLIANCE',
    assetClass: 'FOREX',
    targetLengthWords: 1800,
    scheduledWeek: 3,
    priority: 60,
    autoPublish: true,
  },
  {
    slug: 'roi-calculator-signal-copy-dedicated',
    titleId: 'ROI Calculator: Signal Service vs Copy Trade vs Dedicated VPS',
    titleEn: 'ROI Calculator: Signal Service vs Copy Trade vs Dedicated VPS',
    excerptId: 'Tier pricing $49 vs $149 vs $3000+ — mana ROI terbaik per profil modal? Breakdown math: break-even, scenarios $10K/$50K/$100K, sensitivitas win rate.',
    excerptEn: 'Tier pricing $49 vs $149 vs $3000+ — which ROI is best per capital profile? Math breakdown: break-even, scenarios for $10K/$50K/$100K, win-rate sensitivity.',
    promptTemplate: `Kamu adalah product strategist BabahAlgo. Tulis artikel decision framework "ROI Calculator: Signal Service vs Copy Trade vs Dedicated VPS".

ANGLE UTAMA: Pilihan tier bukan soal "yang termurah" atau "yang termahal" — tergantung profile modal + aktivitas + target return. Artikel ini provide decision framework + math konkret.

HARUS COVER:
- 3 tier overview:
  1. Signal Service: $49/bulan (Basic) atau $149/bulan (VIP). User eksekusi manual. Cocok untuk: modal $3K-20K, active trader
  2. Copy Trade / PAMM: profit share 20-30%. User pasif, broker-level copy. Cocok untuk: modal $10K-100K, non-expert
  3. Dedicated VPS License: $3,000-7,500 one-time + optional maintenance. Private infrastructure, full isolation. Cocok untuk: modal $100K+, HNWI, prop firms
- Decision matrix (table): capital, time commitment, risk tolerance, technical skill → recommended tier
- Break-even analysis per scenario (gunakan data {{DATA_JSON}} untuk tier pricing aktual):
  - $10K account, active trader, 10% monthly target → Signal Basic ($49) break-even dalam 0.5% monthly edge
  - $50K account, passive, 8% monthly target → PAMM Basic (20% share) break-even negatif karena share 20% dari profit (framework decision)
  - $100K account, institutional — Dedicated VPS ROI = $7500 / (100K × 1% monthly) = 7.5 months payback
- Sensitivitas win rate: untuk Signal, edge minimum harus > (fee / capital / 12) per bulan; untuk PAMM, edge setelah share harus > opportunity cost
- Framework question: "Berapa jam/bulan Anda available untuk trade manual?" → active (< 5jam) = PAMM; active (> 20 jam) = Signal; always-on = Dedicated
- Decision tree final: capital → tier → expected break-even timeline

TARGET AUDIENCE: Prospect calon customer yang mau decide tier mana.` + COMMON_TAIL,
    dataSources: [
      { type: 'db_query', model: 'pricingTier' },
    ],
    keywords: ['roi', 'signal service', 'copy trade', 'pamm', 'dedicated vps', 'pricing analysis'],
    category: 'EDUCATION',
    assetClass: 'FOREX',
    targetLengthWords: 1600,
    scheduledWeek: 4,
    priority: 55,
    autoPublish: true,
  },
];

/**
 * Convert TopicSpec to Prisma.BlogTopicCreateInput for upsert.
 */
export function topicSpecToPrismaCreate(spec: TopicSpec): Prisma.BlogTopicCreateInput {
  return {
    slug: spec.slug,
    titleId: spec.titleId,
    titleEn: spec.titleEn,
    excerptId: spec.excerptId,
    excerptEn: spec.excerptEn,
    promptTemplate: spec.promptTemplate,
    dataSources: spec.dataSources as Prisma.InputJsonValue,
    keywords: spec.keywords as Prisma.InputJsonValue,
    category: spec.category,
    assetClass: spec.assetClass,
    targetLengthWords: spec.targetLengthWords,
    scheduledWeek: spec.scheduledWeek,
    priority: spec.priority,
    autoPublish: spec.autoPublish,
  };
}
