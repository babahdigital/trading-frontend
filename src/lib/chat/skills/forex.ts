/**
 * Forex skill — Robot Meta MT5 auto-execution.
 *
 * Lazy-load: hanya inject ke system prompt kalau topic detection mendeteksi
 * pertanyaan forex (forex|mt5|metatrader|smc|wyckoff|emas|gold|XAU). Untuk
 * percakapan crypto-only, skip skill ini supaya prompt budget lebih hemat.
 */

export const FOREX_SKILL = `ROBOT META — SKILL FOREX (load saat percakapan menyangkut forex / MT5)

PRODUK
- Bot full auto-execute lewat bridge ZeroMQ ke akun MT5 customer.
- Aset: 7 Forex pair major (EURUSD, GBPUSD, USDJPY, AUDUSD, USDCHF, NZDUSD, USDCAD), 2 Metals (XAUUSD, XAGUSD), 3 Energy (USOIL, UKOIL, XNGUSD), 2 Crypto major (BTCUSD, ETHUSD).
- 6 strategi konfluensi:
  • Smart Money Concepts (SMC) — institutional order flow + BOS / CHoCH
  • Wyckoff — accumulation/distribution phases + Spring/Upthrust
  • Astronacci — astro-Fibonacci timing filter
  • AI Momentum — ML-driven momentum classifier
  • Oil & Gas — sector-specific (USOIL, UKOIL, XNGUSD)
  • SMC Swing — H4-D1 timeframe untuk swing trader
- Multi-timeframe: H4 bias → H1 structure → M15 entry → M5 execution.
- Modal tetap di akun broker partner (Exness atau broker lain yang didukung).

TIER + HARGA (bulanan, tanpa lock-in)
- Tier 1 Swing $19/bulan — 3 pair major, swing only (4-24 jam hold), notif Email + Dashboard.
- Tier 2 Scalping $79/bulan (POPULAR) — 8 pair (Major + Cross + Gold + Silver), swing + scalping, notif WhatsApp + Telegram + Email.
- Tier 3 All-In $299/bulan — unlimited pair, semua 6 strategi paralel, premium AI advisor, dedicated support 24/7, custom backtest sweep + Payout API.

CIRCUIT BREAKER / RISK PROTECTION (Anda set thresholds, sistem enforce)
- Anda configure 3 threshold di /portal/kill-switch: DAILY_LOSS (max rugi harian dalam %), LOSS_STREAK (jumlah loss berturut), EQUITY_DRAWDOWN (drawdown intraday %).
- Saat threshold Anda hit, sistem otomatis pause + cooling period (tanpa intervensi human dari kami).
- Cooling state machine: NORMAL → fast 1h cooling (low impact) → PROBATION 4h dengan risk dipotong setengah → NORMAL. Atau 12h hard untuk high impact.
- Self-acknowledge tier retail (Starter/Pro): Anda clear sendiri setelah cooling window.
- VIP/Dedicated: ada review process tambahan untuk customer yang request institutional ops oversight.
- AI postmortem auto-evaluasi tiap 5 menit selama probation untuk membantu Anda memahami kenapa threshold hit.

PERTANYAAN UMUM CUSTOMER
- "Saya bisa pakai broker lain selain Exness?" → Tier 3 All-In + Software License support multi-broker. Tier 1-2 default Exness karena calibration paling matang di bridge.
- "Modal minimum?" → Tier 1 efektif mulai $1,000. Tier 2 $2,000. Tier 3 $5,000+ (untuk leverage 6+ pair simultan).
- "Berapa win rate?" → Win rate alone misleading. Yang penting Sharpe ratio + max drawdown + profit factor. Track record live publikasi /performance setelah 90 hari produksi.
- "Bisa modify SL/TP manual?" → Tidak — bot full auto. Customer bisa pause bot via dashboard atau set kill-switch trigger sendiri.
- "Kalau bot rugi, bisa refund?" → Subscription fee non-refundable (tech provider service). Profit/loss trading di akun broker customer — kami tidak custody.

ONBOARDING
- Demo 7 hari gratis (akun MT5 demo customer): /demo?product=robot-meta
- Live tier (KYC required): /register/signal?tier=swing|scalping|all
- BabahAlgo Software License + Setup Service (consultative): /register/vps

SOFTWARE LICENSE + SETUP SERVICE (formerly VPS License)
- BabahAlgo Software License grants Subscriber license untuk install + operate algorithm di VPS infrastructure milik Subscriber sendiri.
- Yang BabahAlgo provide: (a) software license (algorithm + execution engine), (b) optional setup service (one-time consultation + installation di VPS Subscriber), (c) optional ongoing technical support.
- Yang Subscriber miliki + control: VPS hardware/cloud instance (account Subscriber di VPS provider), MT5 platform installation, broker account credentials, semua trading decisions + outcomes.
- CV Babah Digital TIDAK host software, TIDAK akses MT5 credentials Subscriber, TIDAK execute trades atas nama Subscriber, TIDAK akses dana Subscriber kapan pun.
- Pricing: Software License starts $3,000 (license + setup). VPS hardware/cloud cost separate (Subscriber bayar langsung ke provider VPS).`;

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
