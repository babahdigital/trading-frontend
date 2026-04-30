/**
 * Authenticated skill — saat user sudah login dan tergabung di tenant.
 *
 * Inject ke system prompt hanya kalau session valid + tenant API token
 * tersedia. Memberikan kemampuan kepada AI untuk address user by name +
 * mention live trading state (floating P&L, kill-switch status, dll.).
 *
 * Future: tool calls untuk mutate state (trigger kill-switch, pause bot).
 * Sementara ini read-only context — AI hanya bisa BACA state dan
 * suggest action ke user, bukan execute langsung.
 */

export interface AuthenticatedContext {
  userId: string;
  email: string;
  name: string | null;
  role: string;
  /** Tier subscription saat ini (free/starter/pro/vip/dedicated) */
  tier: string | null;
  /** Apakah user punya kill-switch event aktif */
  killSwitchActive: boolean;
  /** Floating PnL ringkas (USD) untuk awareness */
  floatingPnlUsd: number | null;
  /** Jumlah open positions saat ini */
  openPositions: number;
}

export function buildAuthenticatedSkill(ctx: AuthenticatedContext): string {
  const greeting = ctx.name ? `Pengguna sudah login: ${ctx.name} (${ctx.email})` : `Pengguna sudah login: ${ctx.email}`;
  const lines = [
    `KONTEKS USER (saat ini login):`,
    `- ${greeting}`,
    ctx.tier ? `- Tier: ${ctx.tier.toUpperCase()}` : null,
    ctx.openPositions > 0 ? `- Posisi terbuka: ${ctx.openPositions}` : `- Tidak ada posisi terbuka saat ini.`,
    ctx.floatingPnlUsd !== null ? `- Floating P&L saat ini: ${ctx.floatingPnlUsd >= 0 ? '+' : ''}$${ctx.floatingPnlUsd.toFixed(2)}` : null,
    ctx.killSwitchActive
      ? `- ⚠ KILL-SWITCH AKTIF — bot sedang dalam mode cooling/probation.`
      : `- Kill-switch: NORMAL (bot trading aktif).`,
  ].filter(Boolean);

  const guidance = `
PANDUAN PERSONAL:
- Sapa user dengan nama saat pertama kali balas (tidak setiap pesan).
- Boleh reference state real-time di atas saat menjawab pertanyaan terkait akun ("Saat ini Anda punya 3 posisi terbuka, floating +$45...").
- Kalau user minta "stop trading" atau "matikan bot" → arahkan ke /portal → Settings → Trading Toggle. JANGAN klaim sudah men-trigger; FE tools belum ship — kami arahkan ke action self-service.
- Kalau user minta "trigger kill-switch" → arahkan ke /portal/kill-switch. Jelaskan: kill-switch otomatis sudah jalan kalau ambang trigger tercapai; manual force-trigger butuh admin.
- Kalau user tanya "berapa profit hari ini" → reference floatingPnlUsd di atas, atau arahkan ke /portal/performance untuk breakdown.
- TIDAK BOLEH share informasi user lain. Akses scoped ke user yang login saja.
`;

  return [lines.join('\n'), guidance.trim()].join('\n\n');
}

/**
 * Anonymous fallback — saat user belum login. Tetap injeksikan supaya AI
 * tahu konteks bahwa user adalah prospek, bukan customer eksisting.
 */
export const ANONYMOUS_CONTEXT = `KONTEKS USER:
- Pengguna BELUM LOGIN (anonymous prospect / calon customer).
- Boleh sebut produk + harga + onboarding path. Tidak ada akses ke akun spesifik.
- Kalau user tanya hal yang butuh login (cek floating P&L, kill-switch status, dll.), tawarkan untuk login dulu via /login. Atau register kalau belum punya akun via /register/signal atau /register/crypto.
- Kalau user tertarik tapi masih ragu, tawarkan demo gratis 7 hari di /demo.`;
