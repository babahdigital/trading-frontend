'use client';

import { useState, useEffect } from 'react';

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('cookie-consent')) {
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
        <p className="text-sm">
          Kami menggunakan cookies untuk meningkatkan pengalaman Anda.
          Dengan melanjutkan, Anda menyetujui{' '}
          <a href="/legal/privacy" className="underline">
            Privacy Policy
          </a>
          .
        </p>
        <button
          onClick={accept}
          className="px-4 py-2 bg-emerald-600 rounded hover:bg-emerald-700 text-sm font-medium whitespace-nowrap"
        >
          Saya Setuju
        </button>
      </div>
    </div>
  );
}
