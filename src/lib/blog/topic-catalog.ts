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
    slug: 'roi-calculator-signal-crypto-license',
    titleId: 'ROI Calculator: Signal Service vs Crypto Bot vs Software License',
    titleEn: 'ROI Calculator: Signal Service vs Crypto Bot vs Software License',
    excerptId: 'Tier pricing $19 vs $49 vs $3000+ — mana ROI terbaik per profil modal? Breakdown math: break-even, scenarios $10K/$50K/$100K, sensitivitas win rate.',
    excerptEn: 'Tier pricing $19 vs $49 vs $3000+ — which ROI is best per capital profile? Math breakdown: break-even, scenarios for $10K/$50K/$100K, win-rate sensitivity.',
    promptTemplate: `Kamu adalah product strategist BabahAlgo (positioning: software vendor zero-custody, BUKAN asset manager). Tulis artikel decision framework "ROI Calculator: Signal Service vs Crypto Bot vs Software License".

ANGLE UTAMA: Pilihan tier bukan soal "yang termurah" atau "yang termahal" — tergantung profile modal + aktivitas + target return. Artikel ini provide decision framework + math konkret. Semua tier flat monthly subscription — TIDAK ada profit share, TIDAK ada performance fee, TIDAK ada PAMM/managed account.

HARUS COVER:
- 3 product line overview (semua flat monthly, zero-custody — customer kontrol penuh akun broker/exchange):
  1. Signal Service (Forex MT5): $19/bulan (Tier 1 Swing) atau $79/bulan (Tier 2 Scalping) atau $299/bulan (Tier 3 All-in). Software bridge ke akun MT5 milik customer. Customer set risk parameter sendiri.
  2. Crypto Bot (Binance API): $49/bulan (Basic), $199/bulan (Pro), $499/bulan (HNWI) — semua FLAT. Customer pegang Binance API key (Read+Trade only, Withdraw disabled). Modal tetap di akun Binance customer.
  3. Software License (deployment on-prem di VPS milik customer): $3,000-7,500 one-time setup + maintenance. Software install di VPS customer, customer sediakan VPS + broker credentials. BabahAlgo provide license + setup consulting saja.
- Decision matrix (table): capital, time commitment, risk tolerance, technical skill → recommended tier
- Break-even analysis per scenario (gunakan data {{DATA_JSON}} untuk tier pricing aktual):
  - $10K account, active forex trader → Signal Tier 1 ($19/bulan) break-even di ~0.2% monthly edge
  - $50K account, crypto preference → Crypto Pro ($199/bulan) break-even di ~0.4% monthly edge — flat fee, semua hasil profit milik customer
  - $100K+ account, prop firm / HNWI — Software License ($7,500 setup + $300/bulan) ROI = setup amortize across 24 months + flat maintenance
- Sensitivitas win rate: untuk semua tier, edge minimum harus > (fee / capital / 12) per bulan. Karena flat fee (bukan PS), customer tidak kena charge ekstra saat profit besar — incentive aligned.
- Framework question: "Forex atau crypto?" + "Active manual trading atau full automation?" + "Modal sendiri kelola atau VPS sendiri?"
- Decision tree final: asset class → automation level → capital tier → expected break-even

PENTING (compliance copy guard):
- JANGAN sebut "PAMM", "managed account", "profit share", "performance fee", "high-water mark", "kami trade untuk Anda".
- ALWAYS frame: "software vendor", "Anda execute", "customer kontrol penuh", "zero-custody".

TARGET AUDIENCE: Prospect calon customer yang mau decide tier mana.` + COMMON_TAIL,
    dataSources: [
      { type: 'db_query', model: 'pricingTier' },
    ],
    keywords: ['roi', 'signal service', 'crypto bot', 'software license', 'pricing analysis', 'flat subscription'],
    category: 'EDUCATION',
    assetClass: 'FOREX',
    targetLengthWords: 1600,
    scheduledWeek: 4,
    priority: 55,
    autoPublish: true,
  },
  {
    slug: 'usdt-m-futures-vs-spot-trading',
    titleId: 'USDT-M Futures vs Spot Trading: Panduan Lengkap untuk Pemula',
    titleEn: 'USDT-M Futures vs Spot Trading: A Complete Guide for Beginners',
    excerptId: 'Bingung pilih USDT-M Futures atau Spot? Breakdown mekanisme, leverage, funding rate, dan kapan masing-masing cocok untuk profil risiko Anda.',
    excerptEn: 'Confused between USDT-M Futures and Spot? Breakdown of mechanics, leverage, funding rate, and when each suits your risk profile.',
    promptTemplate: `Kamu adalah crypto educator profesional. Tulis artikel "USDT-M Futures vs Spot Trading: Panduan Lengkap untuk Pemula".

ANGLE UTAMA: Banyak pemula langsung trading futures tanpa paham bedanya dengan spot. Artikel ini memberikan framework keputusan yang jelas.

HARUS COVER:
- Definisi Spot vs USDT-M Futures (mekanisme dasar, margin, settlement)
- Leverage: double-edged sword — contoh math $1000 modal, 5x leverage, gerakan 2%
- Funding rate: apa itu, bagaimana mempengaruhi posisi overnight
- Liquidation: bagaimana terjadi, cross vs isolated margin
- Risk framework: kapan Futures masuk akal (hedging, short-selling, modal efisien) vs kapan Spot lebih aman
- BabahAlgo context: kami HANYA jalankan USDT-M Futures karena bi-directional (long+short) dan capital efficiency. Semua risk dikelola oleh 12-layer framework.

COMPLIANCE: Jangan frame futures sebagai "lebih untung". Frame sebagai alat yang butuh risk management ketat.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['usdt-m futures', 'spot trading', 'leverage', 'liquidation', 'funding rate', 'binance futures'],
    category: 'EDUCATION',
    assetClass: 'CRYPTO',
    targetLengthWords: 1400,
    scheduledWeek: 5,
    priority: 70,
    autoPublish: true,
  },
  {
    slug: 'kill-switch-trading-kenapa-penting',
    titleId: 'Kill Switch dalam Trading: Mengapa Setiap Trader Butuh Rem Darurat',
    titleEn: 'Kill Switch in Trading: Why Every Trader Needs an Emergency Brake',
    excerptId: 'Drawdown 30% dalam satu hari bukan hal langka. Kill switch adalah fitur yang memutus eksekusi otomatis saat kerugian melewati batas — apa itu dan bagaimana implementasinya.',
    excerptEn: 'A 30% drawdown in a single day is not uncommon. Kill switch is the feature that cuts automated execution when losses exceed limits — what it is and how to implement it.',
    promptTemplate: `Kamu adalah risk engineer dari trading firm institusional. Tulis artikel "Kill Switch dalam Trading: Mengapa Setiap Trader Butuh Rem Darurat".

ANGLE UTAMA: Kebanyakan kerugian besar terjadi bukan dari satu trade buruk, tapi dari cascade — satu loss memicu loss berikutnya (revenge trading, averaging down, slippage). Kill switch memotong cascade ini secara mekanis.

HARUS COVER:
- Case study: flash crash (2015 CHF, 2020 COVID) — bagaimana trader tanpa kill switch kehilangan lebih dari 100% modal
- Kill switch types: daily loss limit, consecutive loss limit, drawdown percentage, time-based (cooling-off)
- Multi-stage cooldown: soft warning → reduced position size → full halt → cooloff period
- Implementasi BabahAlgo: 3 stage kill switch (warning → reduced → halt) + 24h cooling-off + admin resolve
- Psikologi: mengapa manual stop-loss tidak cukup (overconfidence bias, "it will come back")
- Actionable: checklist 5 langkah setup kill switch untuk manual trader

COMPLIANCE: Frame sebagai risk management — BUKAN sebagai jaminan tidak loss.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['kill switch', 'risk management', 'drawdown', 'flash crash', 'stop loss', 'circuit breaker'],
    category: 'RISK',
    assetClass: 'MULTI',
    targetLengthWords: 1500,
    scheduledWeek: 5,
    priority: 65,
    autoPublish: true,
  },
  {
    slug: 'smart-money-concepts-panduan-order-block-fvg',
    titleId: 'Smart Money Concepts: Panduan Order Block, FVG, dan Liquidity',
    titleEn: 'Smart Money Concepts: Guide to Order Blocks, FVG, and Liquidity',
    excerptId: 'Institutional trader meninggalkan jejak di chart — order block, fair value gap, dan liquidity pool. Panduan visual untuk membaca market structure seperti prop trader.',
    excerptEn: 'Institutional traders leave footprints on charts — order blocks, fair value gaps, and liquidity pools. A visual guide to reading market structure like a prop trader.',
    promptTemplate: `Kamu adalah ex-prop trader yang ahli di Smart Money Concepts (ICT methodology). Tulis artikel "Smart Money Concepts: Panduan Order Block, FVG, dan Liquidity".

ANGLE UTAMA: Retail trader pakai support/resistance tradisional. Institutional trader pakai SMC — berbasis order flow, bukan pattern recognition. Artikel ini panduan visual step-by-step.

HARUS COVER:
- Market Structure: CHoCH (Change of Character) dan BOS (Break of Structure) — bagaimana identify trend shift
- Order Block: definisi, cara identify dari chart, why it works (institutional pending orders)
- Fair Value Gap (FVG): imbalance zone, retracement target
- Liquidity pool: stop hunt, equal highs/lows — bagaimana bank "sweep" retail stop losses
- BabahAlgo SMC implementation: strategi SMC Scalper dan SMC Swing keduanya pakai framework ini
- Confluence: bagaimana gabung OB + FVG + liquidity dalam satu setup (multi-timeframe)

COMPLIANCE: SMC bukan holy grail — success rate tergantung market condition (trending vs ranging).` + COMMON_TAIL,
    dataSources: [],
    keywords: ['smart money concepts', 'order block', 'fair value gap', 'liquidity', 'ICT', 'market structure', 'CHoCH'],
    category: 'STRATEGY',
    assetClass: 'FOREX',
    targetLengthWords: 1600,
    scheduledWeek: 6,
    priority: 75,
    autoPublish: true,
  },
  {
    slug: 'backtesting-vs-live-trading-gap',
    titleId: 'Backtesting vs Live Trading: Mengapa Strategi Profit di Backtest Gagal di Market',
    titleEn: 'Backtesting vs Live Trading: Why Profitable Backtest Strategies Fail in Markets',
    excerptId: 'Strategi WR 70% di backtest tapi merah di live? Overfitting, slippage, regime change — 5 penyebab utama dan bagaimana professional mengatasi gap ini.',
    excerptEn: 'Strategy with 70% WR in backtest but red live? Overfitting, slippage, regime change — 5 root causes and how professionals bridge this gap.',
    promptTemplate: `Kamu adalah quantitative researcher yang sudah backtesting ribuan strategi. Tulis artikel "Backtesting vs Live Trading: Mengapa Strategi Profit di Backtest Gagal di Market".

ANGLE UTAMA: Backtest yang terlihat sempurna sering gagal di live. Masalahnya bukan backtest-nya buruk, tapi banyak trader retail tidak paham pitfall-nya. Artikel ini breakdown gap dan solusinya.

HARUS COVER:
- Overfitting (curve-fitting): strategi yang "dioptimasi" untuk data historis tapi tidak generalize
- Look-ahead bias: menggunakan data masa depan secara tidak sadar (e.g. close price untuk entry)
- Survivorship bias: hanya backtest instrument yang survive (delisted stock/pairs tidak masuk)
- Slippage dan spread: backtest asumsi fill di mid-price, live trading ada slippage terutama saat news
- Regime change: strategy yang work di trending market gagal saat ranging (dan sebaliknya)
- Solusi institutional: walk-forward optimization, out-of-sample testing, Monte Carlo simulation
- BabahAlgo approach: shadow mode 30 hari sebelum go live, A/B testing via Thompson Sampling

COMPLIANCE: Backtest bukan prediksi — ini simulasi. Past performance ≠ future results.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['backtesting', 'overfitting', 'live trading', 'walk-forward', 'monte carlo', 'slippage'],
    category: 'EDUCATION',
    assetClass: 'MULTI',
    targetLengthWords: 1500,
    scheduledWeek: 6,
    priority: 65,
    autoPublish: true,
  },
  {
    slug: 'binance-api-key-security-guide',
    titleId: 'Panduan Keamanan API Key Binance: Best Practice untuk Auto-Trading',
    titleEn: 'Binance API Key Security Guide: Best Practices for Auto-Trading',
    excerptId: 'API key adalah "kunci rumah" akun trading Anda. Panduan step-by-step membuat, mengamankan, dan membatasi permission API key Binance untuk auto-trading.',
    excerptEn: 'Your API key is the "house key" to your trading account. Step-by-step guide to creating, securing, and restricting Binance API key permissions for auto-trading.',
    promptTemplate: `Kamu adalah cybersecurity expert yang spesialisasi crypto exchange API security. Tulis artikel "Panduan Keamanan API Key Binance: Best Practice untuk Auto-Trading".

ANGLE UTAMA: Banyak trader baru langsung kasih API key ke bot tanpa paham risiko. Artikel ini panduan keamanan yang pragmatic — bukan paranoia, tapi risk mitigation yang masuk akal.

HARUS COVER:
- Permission scope: Read, Trade, Withdraw — kenapa JANGAN pernah enable Withdraw
- IP whitelist: cara setup, trade-off antara keamanan dan convenience
- BabahAlgo policy: kami WAJIBKAN customer TANPA Withdraw permission, backend REJECT key yang punya withdraw
- API key rotation: kapan dan bagaimana rotate key
- Monitoring: cara check API key usage di Binance dashboard
- Step-by-step visual: buat API key dengan permission minimal (Read + Futures Trade only)
- Red flags: tanda API key compromised dan emergency action plan

COMPLIANCE: BabahAlgo zero-custody — kami tidak pernah pegang dana customer. API key hanya untuk Read + Trade scope.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['binance api key', 'api security', 'auto trading', 'crypto security', 'ip whitelist', 'zero custody'],
    category: 'OPERATIONS',
    assetClass: 'CRYPTO',
    targetLengthWords: 1300,
    scheduledWeek: 7,
    priority: 70,
    autoPublish: true,
  },
  {
    slug: 'drawdown-recovery-math-psychology',
    titleId: 'Matematika Drawdown: Mengapa Recovery dari -50% Butuh +100%',
    titleEn: 'Drawdown Mathematics: Why Recovery from -50% Requires +100%',
    excerptId: 'Drawdown bukan linear — recovery dari 50% loss butuh 100% gain. Breakdown math, strategi recovery institutional, dan framework position sizing yang mencegah drawdown fatal.',
    excerptEn: 'Drawdown is not linear — recovery from a 50% loss requires a 100% gain. Math breakdown, institutional recovery strategies, and position sizing frameworks that prevent fatal drawdowns.',
    promptTemplate: `Kamu adalah portfolio risk manager dari hedge fund. Tulis artikel "Matematika Drawdown: Mengapa Recovery dari -50% Butuh +100%".

ANGLE UTAMA: Trader retail underestimate dampak drawdown karena berpikir linear. Artikel ini breakdown math non-linear drawdown + framework institutional untuk prevent dan recover.

HARUS COVER:
- Math dasar: loss vs recovery (10% loss → 11.1% recovery, 50% loss → 100% recovery, 90% loss → 900% recovery)
- Tabel lengkap drawdown vs recovery requirement
- Time dimension: berapa lama recovery realistis berdasarkan expected return 1-3% per bulan
- Maximum acceptable drawdown: institutional standard (15-20% max DD untuk fund besar)
- Position sizing sebagai first line of defense: fixed fractional (1-2% risk per trade)
- Kelly Criterion dan Half-Kelly: optimal vs safe sizing
- BabahAlgo approach: 12-layer risk framework, kill switch, max 2% risk per trade di tier tertinggi
- Actionable: 3 rules emas — never risk >2% per trade, max DD cap 15%, cooling-off setelah -10%

COMPLIANCE: Drawdown adalah bagian dari trading — tidak bisa dieliminasi, hanya dikelola.` + COMMON_TAIL,
    dataSources: [],
    keywords: ['drawdown', 'recovery', 'position sizing', 'kelly criterion', 'risk management', 'max drawdown'],
    category: 'RISK',
    assetClass: 'MULTI',
    targetLengthWords: 1500,
    scheduledWeek: 7,
    priority: 60,
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
