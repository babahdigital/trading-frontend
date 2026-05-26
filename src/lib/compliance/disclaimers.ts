/**
 * Centralized compliance copy — SINGLE SOURCE OF TRUTH.
 *
 * All pages, components, email templates, and chat skills that display
 * legal/compliance text MUST import from here. When legal wording changes,
 * update HERE ONLY — everything else follows.
 *
 * Categories:
 *   - Zero-custody (business model positioning)
 *   - Risk disclaimer (past performance, capital loss)
 *   - Advisory-only (AI is not decision-maker)
 *   - No-PAMM (no managed accounts / profit share)
 */

export interface ComplianceCopy {
  id: string;
  en: string;
}

// ─── Zero-Custody ───

export const ZERO_CUSTODY_SHORT: ComplianceCopy = {
  id: 'Zero-custody · Modal tetap di akun broker / Binance Anda',
  en: 'Zero-custody · Capital stays in your broker / Binance account',
};

export const ZERO_CUSTODY_FULL: ComplianceCopy = {
  id: 'Kami software vendor zero-custody: tidak menerima setoran, tidak memegang power of attorney, dan tidak dapat withdraw dana klien. Modal selalu di kendali penuh Anda.',
  en: 'We are a zero-custody software vendor: we do not accept deposits, hold power of attorney, or have the ability to withdraw client funds. Capital always remains under your full control.',
};

export const ZERO_CUSTODY_CRYPTO: ComplianceCopy = {
  id: 'Anda pegang Binance API key (Read + Trade scope, tanpa Withdraw permission). Modal tetap di akun Binance Anda.',
  en: 'You hold the Binance API key (Read + Trade scope, no Withdraw permission). Capital stays in your Binance account.',
};

export const ZERO_CUSTODY_FOREX: ComplianceCopy = {
  id: 'Bot eksekusi langsung di akun MT5 Anda — modal tetap di akun broker Anda, kami tidak custody dana sama sekali.',
  en: 'Bot executes directly in your MT5 account — capital stays in your broker account, we do not custody any funds.',
};

// ─── Risk Disclaimer ───

export const RISK_DISCLAIMER_STANDARD: ComplianceCopy = {
  id: 'Kinerja masa lalu tidak menjamin hasil di masa depan. Trading instrumen finansial mengandung risiko substansial dan dapat mengakibatkan kerugian sebagian atau seluruh modal.',
  en: 'Past performance does not guarantee future results. Trading financial instruments involves substantial risk and may result in partial or total loss of capital.',
};

export const RISK_DISCLAIMER_LEVERAGE: ComplianceCopy = {
  id: 'Leverage yang tinggi dapat bekerja dua arah — untuk Anda maupun melawan Anda. Pastikan Anda memahami profil risiko Anda sebelum mengaktifkan tier apa pun.',
  en: 'High leverage cuts both ways — for you and against you. Make sure you understand your risk profile before activating any tier.',
};

export const RISK_DISCLAIMER_ARTICLE: ComplianceCopy = {
  id: 'Konten edukasi — bukan saran investasi. Trading forex dan crypto melibatkan risiko kehilangan modal.',
  en: 'Educational content — not investment advice. Forex and crypto trading involves risk of capital loss.',
};

// ─── Advisory-Only (AI) ───

export const AI_ADVISORY_ONLY: ComplianceCopy = {
  id: 'Komponen AI bersifat advisory saja — riset, analisis, dan konten. Seluruh keputusan trading dijalankan oleh engine deterministik rule-based, tanpa komponen AI.',
  en: 'AI components are advisory only — research, analysis, and content. All trading decisions are executed by a deterministic rule-based engine, with no AI component.',
};

// ─── No-PAMM / No Managed Account ───

export const NO_PAMM: ComplianceCopy = {
  id: 'Auto-trading software · Anda execute · Zero-custody · No PAMM · No managed account',
  en: 'Auto-trading software · You execute · Zero-custody · No PAMM · No managed account',
};

export const NO_PROFIT_SHARE: ComplianceCopy = {
  id: 'Pricing flat monthly — tidak ada profit share, tidak ada performance fee.',
  en: 'Flat monthly pricing — no profit share, no performance fee.',
};

// ─── Convenience accessor ───

export function getDisclaimer(
  copy: ComplianceCopy,
  locale: 'id' | 'en',
): string {
  return locale === 'en' ? copy.en : copy.id;
}

export function getFullRiskDisclaimer(locale: 'id' | 'en'): string {
  return `${getDisclaimer(RISK_DISCLAIMER_STANDARD, locale)} ${getDisclaimer(RISK_DISCLAIMER_LEVERAGE, locale)}`;
}
