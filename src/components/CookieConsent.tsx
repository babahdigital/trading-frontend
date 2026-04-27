'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export function CookieConsent() {
  const t = useTranslations('cookie_consent');
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('cookie-consent')) {
      setShow(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-white p-4 z-50">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-sm leading-relaxed">
          {t('body_pre')}{' '}
          <Link href="/legal/privacy" className="underline">
            {t('body_link')}
          </Link>
          {' '}{t('body_post')}
        </p>
        <button
          onClick={accept}
          className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700 text-sm font-medium whitespace-nowrap"
        >
          {t('accept')}
        </button>
      </div>
    </div>
  );
}
