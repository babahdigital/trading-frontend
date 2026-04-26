/**
 * E.164 helpers for WhatsApp number normalization.
 *
 * Fonnte requires `+62812...` style format. We accept loose user input
 * (spaces, dashes, leading 0, `+`, parentheses) and produce canonical E.164.
 */

const DIGITS_RE = /\d/g;

/**
 * Normalize free-form phone input to E.164 with the supplied country code.
 *
 * Rules:
 *   - Strip all non-digits.
 *   - If the input already starts with the country code, keep it.
 *   - If the input starts with a single 0 (Indonesian local style),
 *     replace the leading 0 with the country code.
 *   - Reject if the resulting string is shorter than 8 digits or longer
 *     than 20 (broad ITU bounds — strict per-country validation is
 *     deferred to Fonnte's `/validate` round-trip).
 */
export function toE164(input: string, countryCode: string): string | null {
  const cc = countryCode.replace(/\D+/g, '');
  if (!cc) return null;
  const digits = (input.match(DIGITS_RE) || []).join('');
  if (!digits) return null;

  let national: string;
  if (digits.startsWith(cc)) {
    national = digits;
  } else if (digits.startsWith('0')) {
    national = cc + digits.slice(1);
  } else {
    national = cc + digits;
  }

  if (national.length < 8 || national.length > 20) return null;
  return `+${national}`;
}

/**
 * Mask the middle of an E.164 string for audit logs and UI hints.
 *
 *   `+6281234567890` → `+6281****7890`
 */
export function maskWhatsappNumber(e164: string | null | undefined): string {
  if (!e164) return '—';
  const sanitized = e164.startsWith('+') ? e164 : `+${e164}`;
  if (sanitized.length <= 8) return sanitized;
  const head = sanitized.slice(0, 5);
  const tail = sanitized.slice(-4);
  return `${head}${'*'.repeat(Math.max(2, sanitized.length - 9))}${tail}`;
}

/**
 * Format an E.164 string for display: `+6281234567890` → `+62 812-3456-7890`.
 *
 * Heuristic spacing — gives readable phone presentation in the preferences
 * panel without pulling in a heavy phone-number lib.
 */
export function formatWhatsappDisplay(e164: string | null | undefined): string {
  if (!e164) return '—';
  const cleaned = e164.replace(/[^\d+]/g, '');
  if (cleaned.length < 8) return cleaned;
  // Group: +CC SSS-SSSS-SSSS (variable last group length)
  const cc = cleaned.startsWith('+') ? cleaned.slice(0, 3) : `+${cleaned.slice(0, 2)}`;
  const rest = cleaned.replace(cc, '');
  if (rest.length <= 8) return `${cc} ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `${cc} ${rest.slice(0, 3)}-${rest.slice(3, 7)}-${rest.slice(7)}`;
}

/**
 * Returns true if the input matches the backend's accepted shape:
 * E.164 phone OR group id `<digits>@g.us`.
 */
const TARGET_RE = /^(\+?\d{6,20}|\d+@g\.us)$/;
export function isValidWhatsappTarget(value: string): boolean {
  return TARGET_RE.test(value);
}
