/**
 * Timezone utilities — client-side detection + persistence + Accept-Timezone
 * header helpers per FRONTEND_DEVELOPMENT_GUIDE §4.5.
 *
 * Precedence when resolving effective timezone:
 *   1. Explicit arg (override)
 *   2. localStorage 'babahalgo.timezone'
 *   3. Intl.DateTimeFormat().resolvedOptions().timeZone
 *   4. DEFAULT_TIMEZONE fallback
 */

export const DEFAULT_TIMEZONE = 'Asia/Jakarta';
export const STORAGE_KEY = 'babahalgo.timezone';

/** Common IANA zones shown in the user selector. */
export const COMMON_TIMEZONES: readonly string[] = [
  'Asia/Jakarta',
  'Asia/Makassar',
  'Asia/Jayapura',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Asia/Kuala_Lumpur',
  'Asia/Dubai',
  'Europe/London',
  'Europe/Paris',
  'Europe/Frankfurt',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Australia/Sydney',
  'UTC',
];

/** Best-effort browser timezone detection. Returns DEFAULT_TIMEZONE on failure. */
export function detectBrowserTimezone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && typeof tz === 'string') return tz;
  } catch {
    // no-op
  }
  return DEFAULT_TIMEZONE;
}

/** Read persisted user timezone from localStorage. SSR-safe. */
export function getStoredTimezone(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Persist user timezone to localStorage. No-op on server. */
export function setStoredTimezone(tz: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, tz);
  } catch {
    // no-op (private mode, quota, etc.)
  }
}

/**
 * Resolve effective timezone with precedence. Safe both SSR + CSR.
 *
 * @param explicit optional override (e.g. from server-rendered user profile)
 */
export function resolveTimezone(explicit?: string | null): string {
  if (explicit && typeof explicit === 'string' && explicit.length > 0) return explicit;
  const stored = getStoredTimezone();
  if (stored) return stored;
  return detectBrowserTimezone();
}

/** Format a Date in the user's effective timezone with Indonesian locale defaults. */
export function formatInTimezone(
  date: Date,
  options: Intl.DateTimeFormatOptions & { tz?: string; locale?: string } = {},
): string {
  const { tz, locale = 'id-ID', ...rest } = options;
  const effectiveTz = tz ?? resolveTimezone();
  return new Intl.DateTimeFormat(locale, {
    timeZone: effectiveTz,
    ...rest,
  }).format(date);
}

/** Construct an Accept-Timezone-ready Headers object merging over existing init. */
export function withTimezoneHeader(init: RequestInit = {}, tz?: string): RequestInit {
  const effectiveTz = tz ?? resolveTimezone();
  return {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers((init.headers ?? {}) as HeadersInit).entries()),
      'Accept-Timezone': effectiveTz,
    },
  };
}
