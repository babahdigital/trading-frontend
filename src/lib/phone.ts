/**
 * Phone normalization utilities — E.164 canonical format.
 *
 * Strategy: terima input dalam format apapun (0812..., +62812..., +1...,
 * dll) lalu normalize ke E.164 (+ country code + nasional) untuk
 * persistence dan deep-link wa.me.
 *
 * Default country = 'ID' (Indonesia) karena mayoritas customer BabahAlgo
 * dari Indonesia. Saat user input "0812..." (mode lokal), kita tahu itu
 * +62. Saat user input "+1...", parser detect country code langsung.
 *
 * wa.me link butuh digits-only-no-plus: `wa.me/628123456789`. Bukan +62...
 * Bukan 08... — karena WhatsApp anggap "0" itu local prefix yang
 * di-strip; nomor lokal Indonesia tidak akan resolve ke chat.
 */
// /max build = full country metadata. /min default cuma US/CA/GB =
// Indonesia/MY/SG/UK lain ngga work. Bundle size +250KB tapi worth it
// untuk multi-country trader audience.
import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js/max';

export type NormalizedPhone = {
  /** E.164 canonical: "+628123456789" */
  e164: string;
  /** Display friendly internasional: "+62 812 3456 789" */
  international: string;
  /** Display nasional (untuk locale lokal): "0812-3456-789" */
  national: string;
  /** Country code 2-letter ISO: "ID" / "US" / "MY" */
  country: CountryCode | undefined;
  /** Bare digits untuk wa.me URL: "628123456789" */
  whatsappDigits: string;
};

const DEFAULT_COUNTRY: CountryCode = 'ID';

/**
 * Normalize raw phone input ke struktur konsisten. Throws kalau invalid.
 * Caller boleh wrap di try/catch atau pakai tryNormalize() untuk safe.
 */
export function normalizePhone(raw: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): NormalizedPhone {
  const cleaned = String(raw ?? '').trim();
  if (!cleaned) throw new Error('phone_empty');

  const parsed = parsePhoneNumberFromString(cleaned, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    throw new Error('phone_invalid');
  }

  const e164 = parsed.format('E.164'); // "+628123456789"
  return {
    e164,
    international: parsed.formatInternational(), // "+62 812 3456 789"
    national: parsed.formatNational(),
    country: parsed.country,
    whatsappDigits: e164.replace(/^\+/, ''),
  };
}

/**
 * Safe variant — return null kalau invalid daripada throw.
 */
export function tryNormalizePhone(
  raw: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_COUNTRY,
): NormalizedPhone | null {
  if (!raw) return null;
  try {
    return normalizePhone(raw, defaultCountry);
  } catch {
    return null;
  }
}

/**
 * Quick boolean check — apakah string valid sebagai nomor.
 */
export function isValidPhone(raw: string, defaultCountry: CountryCode = DEFAULT_COUNTRY): boolean {
  return tryNormalizePhone(raw, defaultCountry) !== null;
}

/**
 * Build wa.me deep-link untuk admin click-to-chat. Return null kalau
 * phone invalid (caller tampilkan placeholder atau hide button).
 *
 * Optional `text` di-encode sebagai pre-filled message saat user buka WA.
 */
export function buildWhatsAppLink(rawPhone: string | null | undefined, text?: string): string | null {
  const norm = tryNormalizePhone(rawPhone);
  if (!norm) return null;
  const base = `https://wa.me/${norm.whatsappDigits}`;
  if (text && text.trim()) {
    return `${base}?text=${encodeURIComponent(text)}`;
  }
  return base;
}
