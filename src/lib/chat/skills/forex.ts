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
 *
 * Dynamic data: PRODUK section built from trading-settings.ts (CMS-driven),
 * so strategy/pair/stat changes propagate without code deploys.
 */

import { formatPrice, type Locale } from '@/lib/pricing-format';
import {
  getForexStrategies,
  getForexPairs,
  getForexStats,
  getExecutionModel,
} from '@/lib/trading/trading-settings';

export async function getForexSkill(locale: Locale): Promise<string> {
  const [strategies, pairs, stats, exec] = await Promise.all([
    getForexStrategies(),
    getForexPairs(),
    getForexStats(),
    getExecutionModel(),
  ]);

  const t1 = formatPrice('signal_starter', locale, { period: 'mo', compact: false });
  const t2 = formatPrice('signal_pro', locale, { period: 'mo', compact: false });
  const t3 = formatPrice('signal_vip', locale, { period: 'mo', compact: false });
  const vpsLicense = formatPrice('vps_license_only_setup', locale, { compact: false });
  const modal1k = locale === 'id' ? 'Rp 16 juta' : '$1,000';
  const modal2k = locale === 'id' ? 'Rp 33 juta' : '$2,000';
  const modal5k = locale === 'id' ? 'Rp 80 juta' : '$5,000';

  // ─── Dynamic PRODUK section from trading settings ───

  const strategyLines = strategies.map((s) => {
    const statusTag = s.status === 'new' ? ' (BARU)' : s.status === 'halted' ? ' (PAUSE)' : '';
    const desc = locale === 'id' ? s.desc_id : s.desc_en;
    return `  - ${s.name}${statusTag} — ${desc} Timeframe ${s.timeframe}.`;
  });

  const liveCount = pairs.live.length;
  const shadowCount = pairs.shadow.length;
  const livePairList = pairs.live.join(', ');
  const shadowPairList = pairs.shadow.join(', ');

  const execComponents = exec.components.map((c) => `- ${c}`).join('\n');
  const execDisclaimer = locale === 'id' ? exec.disclaimer_id : exec.disclaimer_en;

  return `ROBOT META — SKILL FOREX (load saat percakapan menyangkut forex / MT5)

PRODUK
- Bot full auto-execute lewat bridge ZeroMQ ke akun MT5 customer.
- ${strategies.length} strategi inti (live di produksi backend, 100% deterministic — tanpa AI dalam keputusan trading):
${strategyLines.join('\n')}
- ${liveCount} pair LIVE: ${livePairList}.
- ${shadowCount} pair SHADOW (monitoring, auto-revisit): ${shadowPairList}.
- Multi-timeframe analysis: H4 bias → H1 structure → M15/M30 entry → M5 execution. Setiap sinyal melewati 4 layer validasi sebelum eksekusi.
- Lifetime stats: ${stats.trades} trades, WR ${stats.winRate}%.
- Modal tetap di akun broker partner (Exness atau broker lain yang didukung).

SIGNAL PIPELINE (bagaimana sinyal dihasilkan)
- Tahap 1: Market data dikumpulkan real-time dari broker (price feed + volume + orderbook depth).
- Tahap 2: Multi-timeframe analysis — identifikasi bias H4, konfirmasi structure H1, cari entry M15, timing M5.
- Tahap 3: Pattern detection — Quasimodo, BOS (Break of Structure), CHoCH (Change of Character), order block, dll.
- Tahap 4: Confidence scoring — rule-based threshold filter memberikan skor probabilitas. Sinyal di bawah threshold di-block otomatis.
- Tahap 5: Position sizing — fixed-fractional sizing (1-2% risk per trade) berdasarkan ATR volatilitas.
- Tahap 6: Execution (kalau enabled) — signal dikirim ke MT5 via ZeroMQ bridge. Atau notification-only kalau customer pilih manual execution.
- Tahap 7: Monitoring + Exit — multi-layer exit: trailing stop + time-based + breakeven move + partial TP.
- PENTING: ${execDisclaimer} AI hanya untuk riset, chat, dan konten advisory.

EXECUTION ENGINE (${exec.type}, ${exec.engine})
${execComponents}
- CATATAN: ${execDisclaimer} AI hanya dipakai untuk riset (Pair Brief), chat assistant, dan konten editorial.

TIER + HARGA (bulanan, tanpa lock-in)
- Tier 1 Swing ${t1} — 3 pair major, swing only (4-24 jam hold), notif Email + Dashboard. Cocok untuk trader yang ingin exposure forex tanpa pantau terus.
- Tier 2 Scalping ${t2} (POPULAR) — 8 pair (Major + Cross + Gold + Silver), swing + scalping, notif WhatsApp + Telegram + Email. Strategi paling aktif: scalping M5-M15 + swing H1-H4.
- Tier 3 All-In ${t3} — unlimited pair, semua ${strategies.length} strategi inti + adaptive risk engine paralel (rule-based, deterministic), premium research advisor (Pair Brief — riset & daily brief per pair), dedicated support 24/7, custom backtest sweep + Payout API.

CIRCUIT BREAKER / RISK PROTECTION (Anda set thresholds, sistem enforce)
- Anda configure 3 threshold di /portal/kill-switch: DAILY_LOSS (max rugi harian dalam %), LOSS_STREAK (jumlah loss berturut), EQUITY_DRAWDOWN (drawdown intraday %).
- Saat threshold Anda hit, sistem otomatis pause + cooling period (tanpa intervensi human dari kami).
- Cooling state machine: NORMAL → fast 1h cooling (low impact) → PROBATION 4h dengan risk dipotong setengah → NORMAL. Atau 12h hard untuk high impact.
- Self-acknowledge tier retail (Starter/Pro): Anda clear sendiri setelah cooling window.
- VIP/Dedicated: ada review process tambahan untuk customer yang request institutional ops oversight.
- Auto-evaluasi tiap 5 menit selama probation untuk membantu Anda memahami kenapa threshold hit.
- Customer bisa set threshold sesuai risk appetite — kami provide default yang conservative (2% daily loss, 3 loss streak, 5% drawdown).

PERTANYAAN UMUM CUSTOMER
- "Apa itu signal trading?" → Signal adalah rekomendasi beli/jual yang dihasilkan algoritma kami setelah multi-timeframe analysis + pattern detection + statistical confidence scoring. Setiap signal punya entry price, stop loss, take profit, dan confidence score. Signal bisa auto-execute (bot jalankan otomatis) atau notification-only (Anda decide sendiri).
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

/** @deprecated kept for backward compat — resolves to 'id' locale. Use getForexSkill(locale). */
export const FOREX_SKILL: Promise<string> = getForexSkill('id');

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
