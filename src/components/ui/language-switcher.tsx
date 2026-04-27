'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from '@/i18n/navigation';
import { Globe } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const toggleLocale = () => {
    const newLocale = locale === 'id' ? 'en' : 'id';
    // Persist explicit user choice via NEXT_LOCALE cookie. Without this, the
    // geo-IP middleware's older cookie or next-intl's internal cookie may
    // override the URL on subsequent visits — causing "I'm in Indonesia but
    // pages still show English". Cookie matches geo-middleware's settings:
    // 1-year persistence, root path, SameSite=lax, server-readable.
    if (typeof document !== 'undefined') {
      document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                 border text-sm hover:bg-accent transition-colors"
      title={locale === 'id' ? 'Switch to English' : 'Ganti ke Bahasa Indonesia'}
    >
      <Globe className="w-4 h-4" />
      <span className="font-medium">{locale === 'id' ? 'EN' : 'ID'}</span>
    </button>
  );
}
