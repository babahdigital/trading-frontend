/**
 * Crypto skill — Robot Crypto Binance Spot + USDT-M Futures.
 *
 * Lazy-load saat percakapan menyangkut crypto / Binance / BTC / ETH.
 *
 * Update 2026-05-01: drop profit share dari semua tier per audit konsultan
 * (managed account framing risk + zero-custody konsistensi). Pricing flat
 * monthly $49 / $199 / $499. Tier value reframe ke fitur (more strategies,
 * pairs, dedicated AM) bukan performance-link.
 */

export const CRYPTO_SKILL = `ROBOT CRYPTO — SKILL CRYPTO (load saat percakapan menyangkut crypto / Binance)

PRODUK
- Auto-trading dengan Binance API key customer.
- API key permission: Read + Trade SAJA. Withdraw HARUS DISABLED (kami verify saat connect — kalau Withdraw enabled, koneksi ditolak).
- Spot + Futures simulation — 3 sampai 12 pair tergantung tier.
- Strategi: scalping_momentum, swing_smc, wyckoff_breakout, mean_reversion, spot_dca_trend, spot_swing_trend.
- Modal tetap di akun Binance customer — kami tidak punya withdraw permission, tidak custody dana.

TIER + HARGA (flat monthly subscription, tanpa profit share, tanpa lock-in)
- Tier Basic $49/bulan — 3 pair otomatis, leverage 5x, strategi scalping_momentum, notif Telegram + dashboard.
- Tier Pro $199/bulan (POPULAR) — 8 pair + 1 manual whitelist, leverage 10x, 4 strategi (SMC + Wyckoff + Momentum + Mean-Rev), Telegram VIP + custom alerts, priority support.
- Tier HNWI $499/bulan — 12 pair custom whitelist/blacklist, leverage 15x, semua 6 strategi + custom tuning, dedicated account manager + SLA 99.9%, monthly performance review call.

VALUE PROGRESSION (kenapa tier mahal lebih bayar):
- Lebih banyak pair simultan = lebih banyak diversifikasi
- Strategi tambahan = lebih banyak setup eksploitasi
- Custom whitelist/blacklist = kontrol lebih granular
- Dedicated AM (HNWI) = ongoing strategy refinement + SLA guarantee

PERTANYAAN UMUM CUSTOMER
- "Kenapa tidak ada profit share?" → Kami tech provider, bukan asset manager. Modal Anda di Binance, tetap Anda yang kontrol. Subscription flat = predictable cost, tidak ada "kena charge ekstra saat profit". Sesuai positioning zero-custody kami.
- "Aman titip API key?" → API key disimpan terenkripsi di Vault — kami sebagai operator pun tidak bisa baca plaintext. Withdraw permission MUST disabled, jadi worst-case bot bisa trade tapi tidak bisa tarik dana.
- "Modal minimum Binance?" → Basic efektif mulai $1K (futures margin requirement). Pro $5K. HNWI $25K+ (untuk 12 pair simultan dengan leverage 15x).
- "Leverage 15x bahaya?" → Default risk per trade tetap 1% account, tidak peduli leverage. Leverage tinggi = lebih banyak posisi paralel, bukan posisi yang lebih besar. Kerangka risiko sama dengan Robot Meta (vol-target sizing, exit multi-layer, circuit breaker).
- "Bisa di Binance Indonesia (Tokocrypto)?" → Saat ini hanya Binance Global. Tokocrypto support roadmap Q4 2026.
- "Spot DCA seperti apa?" → Tier HNWI: weekly trend-pullback DCA pada spot pair (BTC, ETH). Bukan DCA buta — entry dipicu sinyal mean-reversion + trend strength.

KONEK API KEY
- Login portal → /portal/crypto/connect → paste API key + secret → bot auto-verify Withdraw=disabled → activated.
- Bisa pause / disconnect kapan saja dari /portal/crypto.

ONBOARDING
- Demo 7 hari gratis (Binance Testnet, paper money): /demo?product=robot-crypto
- Live: /register/crypto?tier=basic|pro|hnwi → /pricing → payment → /portal/crypto/connect`;

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
