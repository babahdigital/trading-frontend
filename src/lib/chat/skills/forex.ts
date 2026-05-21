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
  • Smart Money Concepts Scalper — keluarga Quasimodo pattern (QM Pure / QM + AO / QM + ADX / QM Full Confluence) di timeframe M5-H1
  • Smart Money Concepts Swing — variant QM yang sama di H1-H4 untuk swing trader
  • Pivot Mean Reversion — fade balik ke daily pivot saat harga overextended (M5-M15)
- Multi-timeframe: H4 bias → H1 structure → M15 entry → M5 execution.
- Modal tetap di akun broker partner (Exness atau broker lain yang didukung).

AI BRAIN (modul pembelajaran adaptif — kerja di belakang layar, tidak perlu user setup)
- Bandit Routing — sistem mirip A/B testing yang otomatis pilih konfluensi terbaik untuk kondisi market saat ini (multi-armed bandit Thompson Sampling).
- Kelly Sizing — formula matematis yang hitung porsi modal optimal per trade berdasarkan win rate + edge historis (fractional Kelly 0.25-0.5, bukan full Kelly supaya tidak overbet).
- Markov TP Engine — exit decision dengan probabilistic model: TP geser otomatis berdasarkan state transition probability (trend continuation vs reversal).
- AI Winprob Filter — model machine learning yang skor probabilitas profit per sinyal sebelum eksekusi; sinyal di-block kalau confidence di bawah threshold.
- Adaptive Exit Layer — AI postmortem otomatis pelajari kapan harus widen SL atau tighten TP berdasarkan equity curve trader (lessons journal).
- Isotonic Calibration — kalibrasi confidence score AI supaya match realitas historis (kalau AI bilang 70% confidence, win rate aktual harus ~70% — tidak overconfident).

TIER + HARGA (bulanan, tanpa lock-in)
- Tier 1 Swing ${t1} — 3 pair major, swing only (4-24 jam hold), notif Email + Dashboard.
- Tier 2 Scalping ${t2} (POPULAR) — 8 pair (Major + Cross + Gold + Silver), swing + scalping, notif WhatsApp + Telegram + Email.
- Tier 3 All-In ${t3} — unlimited pair, semua 3 strategi inti + adaptive risk engine paralel (rule-based, deterministic), premium research advisor (riset & daily brief), dedicated support 24/7, custom backtest sweep + Payout API.

CIRCUIT BREAKER / RISK PROTECTION (Anda set thresholds, sistem enforce)
- Anda configure 3 threshold di /portal/kill-switch: DAILY_LOSS (max rugi harian dalam %), LOSS_STREAK (jumlah loss berturut), EQUITY_DRAWDOWN (drawdown intraday %).
- Saat threshold Anda hit, sistem otomatis pause + cooling period (tanpa intervensi human dari kami).
- Cooling state machine: NORMAL → fast 1h cooling (low impact) → PROBATION 4h dengan risk dipotong setengah → NORMAL. Atau 12h hard untuk high impact.
- Self-acknowledge tier retail (Starter/Pro): Anda clear sendiri setelah cooling window.
- VIP/Dedicated: ada review process tambahan untuk customer yang request institutional ops oversight.
- AI postmortem auto-evaluasi tiap 5 menit selama probation untuk membantu Anda memahami kenapa threshold hit.

PERTANYAAN UMUM CUSTOMER
- "Saya bisa pakai broker lain selain Exness?" → Tier 3 All-In + Software License support multi-broker. Tier 1-2 default Exness karena calibration paling matang di bridge.
- "Modal minimum?" → Tier 1 efektif mulai ${modal1k}. Tier 2 ${modal2k}. Tier 3 ${modal5k}+ (untuk leverage 6+ pair simultan).
- "Berapa win rate?" → Win rate alone misleading. Yang penting Sharpe ratio + max drawdown + profit factor. Track record live publikasi /performance setelah 90 hari produksi.
- "Bisa modify SL/TP manual?" → Tidak — bot full auto. Customer bisa pause bot via dashboard atau set kill-switch trigger sendiri.
- "Kalau bot rugi, bisa refund?" → Subscription fee non-refundable (tech provider service). Profit/loss trading di akun broker customer — kami tidak custody.

ONBOARDING
- Demo 7 hari gratis (akun MT5 demo customer): /demo?product=robot-meta
- Live tier (KYC required): /register?service=signal&tier=swing|scalping|all
- BabahAlgo Software License + Setup Service (consultative): /register?service=vps

SOFTWARE LICENSE + SETUP SERVICE (formerly VPS License)
- BabahAlgo Software License grants Subscriber license untuk install + operate algorithm di VPS infrastructure milik Subscriber sendiri.
- Yang BabahAlgo provide: (a) software license (algorithm + execution engine), (b) optional setup service (one-time consultation + installation di VPS Subscriber), (c) optional ongoing technical support.
- Yang Subscriber miliki + control: VPS hardware/cloud instance (account Subscriber di VPS provider), MT5 platform installation, broker account credentials, semua trading decisions + outcomes.
- CV Babah Digital TIDAK host software, TIDAK akses MT5 credentials Subscriber, TIDAK execute trades atas nama Subscriber, TIDAK akses dana Subscriber kapan pun.
- Pricing: Software License starts ${vpsLicense} (license + setup). VPS hardware/cloud cost separate (Subscriber bayar langsung ke provider VPS).`;
}

/** @deprecated kept for backward compat — defaults to 'id' locale. Use getForexSkill(locale). */
export const FOREX_SKILL = getForexSkill('id');

const FOREX_KEYWORDS = [
  'forex', 'mt5', 'metatrader', 'meta trader',
  'eurusd', 'gbpusd', 'usdjpy', 'audusd', 'nzdusd', 'usdcad', 'usdchf',
  'xau', 'gold', 'emas', 'silver', 'xag',
  'oil', 'usoil', 'ukoil', 'minyak', 'gas', 'xng',
  'smc', 'smart money', 'wyckoff', 'astronacci',
  'robot meta', 'kill switch', 'kill-switch', 'kill swich',
  'signal', 'sinyal', 'sinyal trading',
  'broker', 'exness', 'pip', 'lot', 'leverage forex',
  'swing', 'scalping', 'scalp',
];

export function isForexTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return FOREX_KEYWORDS.some((kw) => lower.includes(kw));
}
