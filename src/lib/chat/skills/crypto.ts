/**
 * Crypto skill — Robot Crypto Binance USDT-M Futures.
 *
 * Lazy-load saat percakapan menyangkut crypto / Binance / BTC / ETH.
 * Futures-only, no spot trading.
 *
 * Locale-aware: getCryptoSkill('id') → harga IDR, getCryptoSkill('en') → USD.
 *
 * Dynamic data: PRODUK + TIER sections built from trading-settings.ts (CMS-driven),
 * so strategy/tier changes propagate without code deploys.
 */

import { formatPrice, type Locale } from '@/lib/pricing-format';
import {
  getCryptoConfig,
  getCryptoStrategies,
} from '@/lib/trading/trading-settings';

export async function getCryptoSkill(locale: Locale): Promise<string> {
  const [config, strategies] = await Promise.all([
    getCryptoConfig(),
    getCryptoStrategies(),
  ]);

  const tDemo = locale === 'id' ? 'Gratis' : 'Free';
  const tStarter = formatPrice('crypto_starter', locale, { period: 'mo', compact: false });
  const tActive = formatPrice('crypto_active', locale, { period: 'mo', compact: false });
  const tPro = formatPrice('crypto_pro', locale, { period: 'mo', compact: false });
  const tHnwi = formatPrice('crypto_hnwi', locale, { period: 'mo', compact: false });
  const modal500 = locale === 'id' ? 'Rp 8 juta' : '$500';
  const modal1500 = locale === 'id' ? 'Rp 25 juta' : '$1,500';
  const modal5k = locale === 'id' ? 'Rp 80 juta' : '$5K';
  const modal10k = locale === 'id' ? 'Rp 160 juta' : '$10K';
  const modal25k = locale === 'id' ? 'Rp 400 juta' : '$25K';
  const modal50k = locale === 'id' ? 'Rp 800 juta' : '$50K';

  // ─── Dynamic strategy + tier lines from trading settings ───

  const strategyList = strategies.map((s) => `${s.name} (${s.tier})`).join(', ');

  const slotRange = config.tiers.length > 0
    ? `${Math.min(...config.tiers.map(t => t.slots))}-${Math.max(...config.tiers.map(t => t.slots))}`
    : '2-7';

  const tierLines = config.tiers.map((t) => {
    const tierStrategies = strategies.filter((s) =>
      t.strategies.includes(s.slug),
    );
    const stratNames = tierStrategies.map((s) => s.name).join(' + ');
    return `  ${t.name}: ${t.slots} slot, leverage ${t.leverage}x, risk ${t.risk_pct}%/trade. Strategi: ${stratNames}.`;
  });

  return `ROBOT CRYPTO — SKILL CRYPTO (load saat percakapan menyangkut crypto / Binance)

PRODUK
- Auto-trading dengan ${config.exchange} API key customer.
- API key permission: Read + Trade SAJA. Withdraw HARUS DISABLED (kami verify saat connect — kalau Withdraw enabled, koneksi ditolak).
- ${config.market} only — pair tergantung tier (${slotRange} slot simultan).${config.hasSpot ? '' : ' Tidak ada spot trading.'}
- ${strategies.length} strategi: ${strategyList}. Seluruh eksekusi 100% deterministic.
- Modal tetap di akun ${config.exchange} customer — kami tidak punya withdraw permission, tidak custody dana.
- 28 stable API endpoint tersedia di backend untuk manajemen: posisi, signal, konfigurasi, tier, billing.
- Setiap request ke backend memerlukan X-Tenant-Id header — data terisolasi per customer (multi-tenant RLS).

${config.tiers.length} TIER + HARGA (flat monthly subscription, tanpa profit share, tanpa lock-in)
- Free Demo ${tDemo} — demo wallet virtual $5K, 30 hari trial, semua strategi tersedia di paper mode. Cocok untuk evaluasi tanpa risiko.
- Starter ${tStarter} — 2 slot simultan, leverage 3x, risk 1.0%/trade, ideal untuk pemula dengan modal ${modal500}+. Notif dashboard + Telegram.
- Active ${tActive} (ENTRY PICK) — 3 slot simultan, leverage 7x, risk 1.25%/trade, modal recommended ${modal1500}+. Strategi tambahan: swing_smc. Cocok trader yang sudah paham dasar crypto.
- Pro ${tPro} (POPULAR) — 5 slot simultan, leverage 12x, risk 1.5%/trade, modal recommended ${modal5k}+ (sweet spot ${modal10k}). 3+ strategi (SMC Scalper + Swing + Mean Reversion), custom alerts, priority support.
- HNWI ${tHnwi} — 7 slot simultan, leverage 20x, risk 2.0%/trade, modal recommended ${modal25k}+ (sweet spot ${modal50k}). Semua strategi + custom whitelist/blacklist + adaptive risk engine + parameter tuning + SLA 99.9% + monthly review call.

TIER SPECS (dynamic from CMS):
${tierLines.join('\n')}

REKOMENDASI TIER BERDASARKAN MODAL (equity bracket logic):
- Modal < $500 → HANYA free demo. Alasan: fee bulanan dibanding profit expected terlalu tinggi (misal: modal $100, fee $9 = 180% dari expected profit 5%). Churn risk tinggi.
- Modal $500-1.5K → Starter ($9). Fee ~2% dari modal per bulan — sustainable.
- Modal $1.5-5K → Active ($19). Sweet spot diversifikasi 3 pair.
- Modal $5-25K → Pro ($49). Bisa 5 pair simultan dengan edge yang jelas.
- Modal $25K+ → HNWI ($199). Full feature + dedicated support.

KENAPA FLAT SUBSCRIPTION (bukan profit share):
- Kami tech provider, bukan asset manager. Modal di ${config.exchange}, tetap customer yang kontrol.
- Subscription flat = predictable cost, tidak ada "kena charge ekstra saat profit".
- Sesuai positioning zero-custody: kami jual software license, bukan jual performance.
- Customer tahu persis biaya bulanan — tidak ada surprise fee.

PERTANYAAN UMUM CUSTOMER
- "Bagaimana cara subscribe crypto bot?" → Pilih tier sesuai modal di /pricing → /register?service=crypto → bayar via Xendit (kartu/QRIS/VA/e-wallet) → login /portal → connect ${config.exchange} API key di /portal/crypto/connect → bot aktif otomatis.
- "Aman titip API key?" → API key disimpan terenkripsi di Vault — kami sebagai operator pun tidak bisa baca plaintext. Withdraw permission MUST disabled, jadi worst-case bot bisa trade tapi tidak bisa tarik dana. Dana customer TIDAK PERNAH meninggalkan akun ${config.exchange} mereka.
- "Modal minimum ${config.exchange}?" → Free demo gratis (paper $5K). Live: Starter mulai ${modal500}, Active ${modal1500}, Pro ${modal5k}, HNWI ${modal25k}+.
- "Leverage 20x bahaya?" → Default risk per trade tetap 1-2% account (tergantung tier), tidak peduli leverage. Leverage tinggi = lebih banyak posisi paralel, bukan posisi yang lebih besar. Kerangka risiko sama dengan Robot Meta (vol-target sizing, exit multi-layer, circuit breaker). Leverage bisa di-set lebih rendah dari max tier — customer yang kontrol.
- "Bisa di Binance Indonesia (Tokocrypto)?" → Saat ini hanya Binance Global. Tokocrypto support roadmap Q4 2026.
- "Bisa ganti pair mana yang di-trade?" → Starter/Active: pair otomatis dikelola oleh sistem (top liquid pair). Pro: bisa request whitelist. HNWI: full custom whitelist/blacklist.
- "Kenapa futures only, bukan spot?" → ${config.market} memungkinkan bi-directional trading (long + short), position sizing lebih presisi, dan risk management yang lebih granular via leverage control. Semua posisi dalam USDT — tidak perlu hold underlying asset.

KONEK API KEY
- Login portal → /portal/crypto/connect → paste API key + secret → bot auto-verify Withdraw=disabled → activated.
- Bisa pause / disconnect kapan saja dari /portal/crypto.
- Kalau customer ganti API key: disconnect lama → connect baru. Posisi terbuka di-close dulu.

FOREX BRIDGE (Cross-Market Intelligence)
- Robot Crypto terhubung ke Forex Calendar API — menerima data event ekonomi real-time (FOMC, CPI, NFP, dll).
- Macro Blackout Guard: 60 menit sebelum high-impact event (FOMC/CPI/NFP), sistem OTOMATIS block entry baru. Posisi existing tetap berjalan dengan trailing stop ketat.
- News Sentiment: BTC/ETH memiliki sentiment tracking dari forex news DB. Altcoin (SOL, XRP, BNB, AVAX) belum di-track sentiment — menggunakan pure technical analysis.
- Kalender ekonomi terintegrasi: bot aware terhadap holiday schedule, market close, dan reduced liquidity window.
- Manfaat bridge: crypto bot tidak "buta" terhadap macro event — menghindari entry saat volatilitas news-driven yang unpredictable.

RISK ENGINE & SAFETY
- Circuit breaker: auto-stop trading saat drawdown harian > 3% (adjustable per tier).
- Kill switch: admin atau customer bisa emergency-stop semua trading via /portal/crypto → instant close all positions.
- Macro blackout: auto-block entry 60 menit sebelum FOMC/CPI/NFP/ECB.
- Position sizing: vol-target ATR-based, bukan fixed lot — ukuran posisi menyesuaikan volatilitas market.
- Multi-layer exit: trailing stop + time-based exit + breakeven move + partial TP.
- Maximum concurrent positions: dibatasi per tier (${slotRange} slot) — tidak pernah over-expose.

ONBOARDING
- Demo 30 hari gratis (${config.exchange} Testnet, paper money $5K): /demo?product=robot-crypto
- Live: /register?service=crypto → /pricing → pilih tier → payment (Xendit) → /portal/crypto/connect`;
}

/** @deprecated kept for backward compat — resolves to 'id' locale. Use getCryptoSkill(locale). */
export const CRYPTO_SKILL: Promise<string> = getCryptoSkill('id');

const CRYPTO_KEYWORDS = [
  'crypto', 'kripto', 'cryptocurrency', 'binance', 'tokocrypto',
  'btc', 'bitcoin', 'eth', 'ethereum', 'usdt', 'usdc',
  'bnb', 'sol', 'solana', 'xrp', 'ripple', 'ada', 'cardano', 'doge', 'dogecoin',
  'spot', 'futures', 'perpetual', 'perp',
  'robot crypto', 'crypto bot', 'bot crypto',
  'leverage', 'margin', 'liquidation', 'liquidasi',
  'binance api', 'api key', 'api-key',
  'dca', 'dollar cost',
  'koin', 'coin', 'token',
  'defi', 'dex', 'cex',
  'hnwi', 'whale',
  'starter', 'active tier',
];

export function isCryptoTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some((kw) => lower.includes(kw));
}
