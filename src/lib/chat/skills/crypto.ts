/**
 * Crypto skill — Robot Crypto Binance Spot + USDT-M Futures.
 *
 * Lazy-load saat percakapan menyangkut crypto / Binance / BTC / ETH.
 *
 * Update 2026-05-01: drop profit share dari semua tier per audit konsultan
 * (managed account framing risk + zero-custody konsistensi). Pricing flat
 * monthly $49 / $199 / $499. Tier value reframe ke fitur (more strategies,
 * pairs, dedicated AM) bukan performance-link.
 *
 * Locale-aware: getCryptoSkill('id') → harga IDR, getCryptoSkill('en') → USD.
 */

import { formatPrice, type Locale } from '@/lib/pricing-format';

export function getCryptoSkill(locale: Locale): string {
  const tBasic = formatPrice('crypto_basic', locale, { period: 'mo', compact: false });
  const tPro = formatPrice('crypto_pro', locale, { period: 'mo', compact: false });
  const tHnwi = formatPrice('crypto_hnwi', locale, { period: 'mo', compact: false });
  const modal1k = locale === 'id' ? 'Rp 16 juta' : '$1K';
  const modal5k = locale === 'id' ? 'Rp 80 juta' : '$5K';
  const modal25k = locale === 'id' ? 'Rp 400 juta' : '$25K';

  return `ROBOT CRYPTO — SKILL CRYPTO (load saat percakapan menyangkut crypto / Binance)

PRODUK
- Auto-trading dengan Binance API key customer.
- API key permission: Read + Trade SAJA. Withdraw HARUS DISABLED (kami verify saat connect — kalau Withdraw enabled, koneksi ditolak).
- Spot + Futures simulation — 3 sampai 12 pair tergantung tier.
- Strategi: scalping_momentum, swing_smc, wyckoff_breakout, mean_reversion, spot_dca_trend, spot_swing_trend.
- Modal tetap di akun Binance customer — kami tidak punya withdraw permission, tidak custody dana.

TIER + HARGA (flat monthly subscription, tanpa profit share, tanpa lock-in)
- Tier Basic ${tBasic} — 3 pair otomatis, leverage 5x, strategi scalping_momentum, notif Telegram + dashboard.
- Tier Pro ${tPro} (POPULAR) — 8 pair + 1 manual whitelist, leverage 10x, 3 strategi (SMC Scalper + SMC Swing + Pivot Mean Reversion), Telegram VIP + custom alerts, priority support.
- Tier HNWI ${tHnwi} — 12 pair custom whitelist/blacklist, leverage 15x, semua 3 strategi inti + AI Brain orchestration + custom tuning, priority technical support + SLA 99.9%, monthly review call.

VALUE PROGRESSION (kenapa tier mahal lebih bayar):
- Lebih banyak pair simultan = lebih banyak diversifikasi
- Strategi tambahan = lebih banyak setup eksploitasi
- Custom whitelist/blacklist = kontrol lebih granular
- Priority technical support (HNWI) = strategy refinement + SLA guarantee. NOTE: technical support saja — kami TIDAK trade untuk Anda, TIDAK akses API key plaintext, TIDAK kasih trading advice spesifik.

PERTANYAAN UMUM CUSTOMER
- "Kenapa tidak ada profit share?" → Kami tech provider, bukan asset manager. Modal Anda di Binance, tetap Anda yang kontrol. Subscription flat = predictable cost, tidak ada "kena charge ekstra saat profit". Sesuai positioning zero-custody kami.
- "Aman titip API key?" → API key disimpan terenkripsi di Vault — kami sebagai operator pun tidak bisa baca plaintext. Withdraw permission MUST disabled, jadi worst-case bot bisa trade tapi tidak bisa tarik dana.
- "Modal minimum Binance?" → Basic efektif mulai ${modal1k} (futures margin requirement). Pro ${modal5k}. HNWI ${modal25k}+ (untuk 12 pair simultan dengan leverage 15x).
- "Leverage 15x bahaya?" → Default risk per trade tetap 1% account, tidak peduli leverage. Leverage tinggi = lebih banyak posisi paralel, bukan posisi yang lebih besar. Kerangka risiko sama dengan Robot Meta (vol-target sizing, exit multi-layer, circuit breaker).
- "Bisa di Binance Indonesia (Tokocrypto)?" → Saat ini hanya Binance Global. Tokocrypto support roadmap Q4 2026.
- "Spot DCA seperti apa?" → Tier HNWI: weekly trend-pullback DCA pada spot pair (BTC, ETH). Bukan DCA buta — entry dipicu sinyal mean-reversion + trend strength.

KONEK API KEY
- Login portal → /portal/crypto/connect → paste API key + secret → bot auto-verify Withdraw=disabled → activated.
- Bisa pause / disconnect kapan saja dari /portal/crypto.

ONBOARDING
- Demo 7 hari gratis (Binance Testnet, paper money): /demo?product=robot-crypto
- Live: /register?service=crypto&tier=basic|pro|hnwi → /pricing → payment → /portal/crypto/connect`;
}

/** @deprecated kept for backward compat — defaults to 'id' locale. Use getCryptoSkill(locale). */
export const CRYPTO_SKILL = getCryptoSkill('id');

const CRYPTO_KEYWORDS = [
  'crypto', 'kripto', 'binance', 'tokocrypto',
  'btc', 'bitcoin', 'eth', 'ethereum', 'usdt', 'usdc',
  'spot', 'futures', 'perpetual',
  'robot crypto', 'crypto bot',
  'leverage', 'margin', 'liquidation', 'liquidasi',
  'binance api', 'api key',
];

export function isCryptoTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some((kw) => lower.includes(kw));
}
