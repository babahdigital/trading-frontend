/**
 * Client-side locale detection — shared by error boundaries that cannot
 * rely on next-intl (they sit outside the locale route segment).
 *
 * Priority: NEXT_LOCALE cookie → navigator.language → fallback 'id'.
 */
export function readClientLocale(): 'id' | 'en' {
  if (typeof document === 'undefined') return 'id';
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(id|en)/);
  if (m) return m[1] as 'id' | 'en';
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('en')) return 'en';
  return 'id';
}
