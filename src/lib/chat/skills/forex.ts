/**
 * Forex skill — Robot Meta MT5 auto-execution.
 *
 * Lazy-load: hanya inject ke system prompt kalau topic detection mendeteksi
 * pertanyaan forex (forex|mt5|metatrader|smc|wyckoff|emas|gold|XAU). Untuk
 * percakapan crypto-only, skip skill ini supaya prompt budget lebih hemat.
 *
 * Locale-aware pricing: getForexSkill('id') return harga dalam IDR (Rupiah),
 * getForexSkill('en') return harga dalam USD. Single source of truth via
 * lib/pricing-format.ts PRICE_TABLE.
 */

import { formatPrice, type Locale } from '@/lib/pricing-format';

export function getForexSkill(locale: Locale): string {
  const t1 = formatPrice('signal_starter', locale, { period: 'mo', compact: false });
  const t2 = formatPrice('signal_pro', locale, { period: 'mo', compact: false });
  const t3 = formatPrice('signal_vip', locale, { period: 'mo', compact: false });
  // 2026-05-18 — switched to canonical License Only key (was legacy alias
  // pointing to the same value but clearer for future maintainers).
  const vpsLicense = formatPrice('vps_license_only_setup', locale, { compact: false });
  const modal1k = locale === 'id' ? 'Rp 16 juta' : '$1,000';
  const modal2k = locale === 'id' ? 'Rp 33 juta' : '$2,000';
  const modal5k = locale === 'id' ? 'Rp 80 juta' : '$5,000';

  return `ROBOT META — SKILL FOREX (load saat percakapan menyangkut forex / MT5)

PRODUK
- Bot full auto-execute lewat bridge ZeroMQ ke akun MT5 customer.
- Aset: 7 Forex pair major (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF, NZDUSD, USDCAD), 2 Metals (XAUUSD, XAGUSD), 3 Energy (USOIL, UKOIL, XNGUSD), 2 Crypto major (BTCUSD, ETHUSD).
- 3 strategi inti (live di produksi backend):
  - Smart Money Concepts Scalper — keluarga Quasimodo pattern (QM Pure / QM + AO / QM + ADX / QM Full Confluence) di timeframe M5-H1. Strategi unggulan: USOIL M15 + XAUUSD M30 (qm_phase_counter) — dua winner strategy dengan track record terbaik.
  - Smart Money Concepts Swing — variant QM yang sama di H1-H4 untuk swing trader (hold 4-24 jam, kadang multi-hari)
  - Pivot Mean Reversion — fade balik ke daily pivot saat harga overextended (M5-M15). Cocok untuk market ranging/sideways.
- Multi-timeframe analysis: H4 bias → H1 structure → M15 entry → M5 execution. Setiap sinyal melewati 4 layer validasi sebelum eksekusi.
- Modal tetap di akun broker partner (Exness atau broker lain yang didukung).

SIGNAL PIPELINE (bagaimana sinyal dihasilkan)
- Tahap 1: Market data dikumpulkan real-time dari broker (price feed + volume + orderbook depth).
- Tahap 2: Multi-timeframe analysis — identifikasi bias H4, konfirmasi structure H1, cari entry M15, timing M5.
- Tahap 3: Pattern detection — Quasimodo, BOS (Break of Structure), CHoCH (Change of Character), order block, dll.
- Tahap 4: Confidence scoring — AI Winprob Filter memberikan skor probabilitas (0-100%). Sinyal di bawah threshold di-block otomatis.
- Tahap 5: Position sizing — Kelly formula hitung lot size optimal berdasarkan win rate + edge. Fractional Kelly (0.25-0.5) supaya conservative.
- Tahap 6: Execution (kalau enabled) — signal dikirim ke MT5 via ZeroMQ bridge. Atau notification-only kalau customer pilih manual execution.
- Tahap 7: Monitoring + Exit — Markov TP Engine monitor posisi terbuka, geser TP/SL berdasarkan market state transition.
- PENTING: AI adalah ADVISORY ONLY — menganalisis dan merekomendasikan. Customer yang decide apakah auto-execute diaktifkan. AI TIDAK membuat keputusan trading — AI menghasilkan sinyal, parameter risiko customer yang decide apakah sinyal dieksekusi.

AI BRAIN (modul pembelajaran adaptif — kerja di belakang layar, tidak perlu user setup)
- Bandit Routing — sistem mirip A/B testing yang otomatis pilih konfluensi terbaik untuk kondisi market saat ini (multi-armed bandit Thompson Sampling).
- Kelly Sizing — formula matematis yang hitung porsi modal optimal per trade berdasarkan win rate + edge historis (fractional Kelly 0.25-0.5, bukan full Kelly supaya tidak overbet).
- Markov TP Engine — exit decision dengan probabilistic model: TP geser otomatis berdasarkan state transition probability (trend continuation vs reversal).
- AI Winprob Filter — model machine learning yang skor probabilitas profit per sinyal sebelum eksekusi; sinyal di-block kalau confidence di bawah threshold.
- Adaptive Exit Layer — AI postmortem otomatis pelajari kapan harus widen SL atau tighten TP berdasarkan equity curve trader (lessons journal).
- Isotonic Calibration — kalibrasi confidence score AI supaya match realitas historis (kalau AI bilang 70% confidence, win rate aktual harus ~70% — tidak overconfident).
- CATATAN: AI Brain adalah modul riset dan optimasi — BUKAN decision-maker. AI mempelajari pola, scoring, dan mengusulkan parameter. Keputusan akhir ada di parameter risiko yang customer set.

TIER + HARGA (bulanan, tanpa lock-in)
- Tier 1 Swing ${t1} — 3 pair major, swing only (4-24 jam hold), notif Email + Dashboard. Cocok untuk trader yang ingin exposure forex tanpa pantau terus.
- Tier 2 Scalping ${t2} (POPULAR) — 8 pair (Major + Cross + Gold + Silver), swing + scalping, notif WhatsApp + Telegram + Email. Strategi paling aktif: scalping M5-M15 + swing H1-H4.
- Tier 3 All-In ${t3} — unlimited pair, semua 3 strategi inti + adaptive risk engine paralel (rule-based, deterministic), premium research advisor (Pair Brief AI — riset & daily brief per pair), dedicated support 24/7, custom backtest sweep + Payout API.

CIRCUIT BREAKER / RISK PROTECTION (Anda set thresholds, sistem enforce)
- Anda configure 3 threshold di /portal/kill-switch: DAILY_LOSS (max rugi harian dalam %), LOSS_STREAK (jumlah loss berturut), EQUITY_DRAWDOWN (drawdown intraday %).
- Saat threshold Anda hit, sistem otomatis pause + cooling period (tanpa intervensi human dari kami).
- Cooling state machine: NORMAL → fast 1h cooling (low impact) → PROBATION 4h dengan risk dipotong setengah → NORMAL. Atau 12h hard untuk high impact.
- Self-acknowledge tier retail (Starter/Pro): Anda clear sendiri setelah cooling window.
- VIP/Dedicated: ada review process tambahan untuk customer yang request institutional ops oversight.
- AI postmortem auto-evaluasi tiap 5 menit selama probation untuk membantu Anda memahami kenapa threshold hit.
- Customer bisa set threshold sesuai risk appetite — kami provide default yang conservative (2% daily loss, 3 loss streak, 5% drawdown).

PERTANYAAN UMUM CUSTOMER
- "Apa itu signal trading?" → Signal adalah rekomendasi beli/jual yang dihasilkan algoritma kami setelah multi-timeframe analysis + pattern detection + AI confidence scoring. Setiap signal punya entry price, stop loss, take profit, dan confidence score. Signal bisa auto-execute (bot jalankan otomatis) atau notification-only (Anda decide sendiri).
- "Saya bisa pakai broker lain selain Exness?" → Tier 3 All-In + Software License support multi-broker. Tier 1-2 default Exness karena calibration paling matang di bridge. Broker BAPPEBTI-licensed recommended: MIFX, Finex, Asia Trade Point Futures.
- "Modal minimum?" → Tier 1 efektif mulai ${modal1k}. Tier 2 ${modal2k}. Tier 3 ${modal5k}+ (untuk leverage 6+ pair simultan).
- "Berapa win rate?" → Win rate alone misleading. Yang penting Sharpe ratio + max drawdown + profit factor. Track record live publikasi /performance setelah 90 hari produksi nyata. Trading carries risk of loss.
- "Bisa modify SL/TP manual?" → Tidak — bot full auto. Customer bisa pause bot via dashboard atau set kill-switch trigger sendiri. SL/TP dihitung otomatis berdasarkan volatilitas + strategy rules.
- "Kalau bot rugi, bisa refund?" → Subscription fee bisa refund 7 hari pertama. Setelah itu non-refundable (tech provider service). Profit/loss trading di akun broker customer — kami tidak custody.
- "Apa itu Pair Brief?" → Fitur AI analysis yang memberikan daily brief untuk setiap pair yang Anda trade. Summary kondisi market, key levels, potential setups — bersifat riset/informasi, BUKAN trading advice.
- "Bagaimana cara mulai?" → (1) Pilih tier di /pricing, (2) /register → bayar via Xendit, (3) KYC verification, (4) Setup akun MT5 di broker, (5) Connect di /portal → bot aktif.
- "Apakah harus paham trading?" → Tidak wajib — bot auto-execute. Tapi kami sangat sarankan paham dasar risk management supaya Anda bisa set kill-switch threshold yang sesuai risk appetite Anda.

FOREX BRIDGE & MACRO INTELLIGENCE
- Calendar API terintegrasi: data event ekonomi real-time (FOMC, CPI, NFP, ECB, BOJ, dll) dari MT5 + ForexFactory.
- Macro Blackout Guard: 60 menit sebelum high-impact event, sistem OTOMATIS block entry baru — mencegah exposure ke volatilitas news-driven yang unpredictable.
- News Sentiment tracking per pair — sentiment score + confidence dari aggregasi berita forex (BTC/ETH juga di-cover untuk cross-market correlation).
- Forex bridge juga terhubung ke Robot Crypto — kalau NFP/FOMC impact crypto (BTC sering bergerak bareng DXY), crypto bot juga auto-blackout.
- Enterprise API key: 120 req/min, 10K req/day — enterprise-grade data feed.

ONBOARDING
- Demo 7 hari gratis (akun MT5 demo customer): /demo?product=robot-meta
- Live tier (KYC required): /register?service=signal&tier=swing|scalping|all
- BabahAlgo Software License + Setup Service (consultative): /register?service=vps

SOFTWARE LICENSE + SETUP SERVICE (formerly VPS License)
- BabahAlgo Software License grants Subscriber license untuk install + operate algorithm di VPS infrastructure milik Subscriber sendiri.
- 3 model arsitektur:
  - License Only (${vpsLicense} setup): klien sediakan SEMUA VPS sendiri, BabahAlgo charge software license + install + ongoing support.
  - Hybrid: klien punya Windows MT5 (broker biasanya kasih), BabahAlgo provision Linux orchestrator.
  - Full Turnkey: BabahAlgo bundle 2 VPS (Windows MT5 + Linux orchestrator) plus full management. All-in-one set & forget.
- Yang BabahAlgo provide: (a) software license (algorithm + execution engine), (b) optional setup service (one-time consultation + installation di VPS Subscriber), (c) optional ongoing technical support.
- Yang Subscriber miliki + control: VPS hardware/cloud instance (account Subscriber di VPS provider), MT5 platform installation, broker account credentials, semua trading decisions + outcomes.
- CV Babah Digital TIDAK host software, TIDAK akses MT5 credentials Subscriber, TIDAK execute trades atas nama Subscriber, TIDAK akses dana Subscriber kapan pun.
- VPS hardware/cloud cost separate (Subscriber bayar langsung ke provider VPS).`;
}

/** @deprecated kept for backward compat — defaults to 'id' locale. Use getForexSkill(locale). */
export const FOREX_SKILL = getForexSkill('id');

const FOREX_KEYWORDS = [
  'forex', 'mt5', 'metatrader', 'meta trader',
  'eurusd', 'gbpusd', 'usdjpy', 'audusd', 'nzdusd', 'usdcad', 'usdchf',
  'xau', 'gold', 'emas', 'silver', 'xag',
  'oil', 'usoil', 'ukoil', 'minyak', 'gas', 'xng',
  'smc', 'smart money', 'wyckoff', 'astronacci',
  'quasimodo', 'qm pattern', 'order block', 'bos', 'choch', 'change of character',
  'break of structure', 'break structure',
  'robot meta', 'kill switch', 'kill-switch', 'kill swich',
  'signal', 'sinyal', 'sinyal trading',
  'broker', 'exness', 'mifx', 'finex', 'pip', 'lot', 'leverage forex',
  'swing', 'scalping', 'scalp',
  'pair brief', 'daily brief',
  'vps', 'vps license', 'software license',
  'circuit breaker', 'cooling', 'probation',
  'mata uang', 'currency', 'valas',
  'bappebti',
];

export function isForexTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return FOREX_KEYWORDS.some((kw) => lower.includes(kw));
}
