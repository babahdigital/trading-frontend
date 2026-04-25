'use client';

import { useLocale } from 'next-intl';
import { Globe } from 'lucide-react';

/**
 * Locale switcher tailored for auth pages (/login, /register/*) which live
 * outside the next-intl [locale] segment. We can't use the locale-aware
 * router here, so we set the NEXT_LOCALE cookie manually and reload.
 */
export function AuthLocaleSwitcher() {
  const locale = useLocale();

  function toggle() {
    const next = locale === 'id' ? 'en' : 'id';
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    window.location.reload();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-card/60 backdrop-blur text-xs sm:text-sm font-medium hover:bg-accent hover:border-amber-500/30 transition-colors"
    >
      <Globe className="h-3.5 w-3.5" />
      <span>{locale === 'id' ? 'EN' : 'ID'}</span>
    </button>
  );
}
