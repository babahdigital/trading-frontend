/**
 * Crypto skill — Robot Crypto Binance Spot + USDT-M Futures.
 *
 * Lazy-load saat percakapan menyangkut crypto / Binance / BTC / ETH.
 */

export const CRYPTO_SKILL = `ROBOT CRYPTO — SKILL CRYPTO (load saat percakapan menyangkut crypto / Binance)

PRODUK
- Auto-trading dengan Binance API key customer.
- API key permission: Read + Trade SAJA. Withdraw HARUS DISABLED (kami verify saat connect — kalau Withdraw enabled, koneksi ditolak).
- Spot + Futures simulation — 3 sampai 12 pair tergantung tier.
- Strategi: scalping_momentum, swing_smc, wyckoff_breakout, mean_reversion, spot_dca_trend, spot_swing_trend.
- Modal tetap di akun Binance customer — kami tidak punya withdraw permission.

TIER + HARGA (bulanan + profit share)
- Tier Basic $49/bulan + 20% profit share — 3 pair otomatis, 5x leverage, scalping momentum saja, notif Telegram + dashboard.
- Tier Pro $199/bulan + 15% profit share (POPULAR) — 8 pair + 1 manual whitelist, 10x leverage, 4 strategi (SMC + Wyckoff + Momentum + Mean-Rev), Telegram VIP.
- Tier HNWI $499/bulan + 10% profit share — 12 pair custom whitelist/blacklist, 15x leverage, semua strategi + tuning, dedicated account manager + SLA 99.9%.

PROFIT SHARE
- Dihitung dari realized PnL bulanan (close trades only, bukan unrealized).
- High-water mark: profit share hanya saat ekuitas tembus level tertinggi sebelumnya. Selama recovery dari drawdown, profit share = 0.
- Tagihan profit share dikirim awal bulan berikutnya, payment via Binance withdrawal manual atau invoice.

PERTANYAAN UMUM CUSTOMER
- "Aman titip API key?" → API key disimpan terenkripsi di Vault — kami sebagai operator pun tidak bisa baca plaintext. Lagipula Withdraw permission MUST disabled, jadi worst-case bot bisa trade tapi tidak bisa tarik dana.
- "Modal minimum Binance?" → Basic efektif mulai $1K (futures margin requirement). Pro $5K. HNWI $25K+ (untuk 12 pair simultan dengan leverage 15x).
- "Leverage 15x bahaya?" → Default risk per trade tetap 1% account, tidak peduli leverage. Leverage tinggi = lebih banyak posisi paralel, bukan posisi yang lebih besar. Kerangka risiko sama dengan Robot Meta (vol-target sizing, exit 6-layer, kill-switch).
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
  'profit share', 'high water mark',
  'binance api', 'api key',
];

export function isCryptoTopic(text: string): boolean {
  const lower = text.toLowerCase();
  return CRYPTO_KEYWORDS.some((kw) => lower.includes(kw));
}
