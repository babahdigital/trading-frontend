/**
 * Detect visitor locale from a Next.js Request for server-side use cases
 * (API routes, email templates, server actions). Mirror of the strategy
 * used by the geo-IP middleware: NEXT_LOCALE cookie wins, then
 * Accept-Language header, then default 'id'.
 */
import type { NextRequest } from 'next/server';

export type AppLocale = 'id' | 'en';

export function detectRequestLocale(request: NextRequest): AppLocale {
  const cookie = request.cookies.get('NEXT_LOCALE')?.value;
  if (cookie === 'en' || cookie === 'id') return cookie;

  const accept = request.headers.get('accept-language') ?? '';
  const langs = accept.split(',').map((s) => s.split(';')[0].trim().toLowerCase());
  const primary = langs[0] ?? '';
  if (primary.startsWith('en')) return 'en';
  if (primary.startsWith('id')) return 'id';
  return 'id';
}
