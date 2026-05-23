'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';

/**
 * Reusable 403 Forbidden component — institutional design matching root error pages.
 * Detects locale from document.cookie (NEXT_LOCALE) or navigator.language.
 */
function readClientLocale(): 'id' | 'en' {
  if (typeof document === 'undefined') return 'id';
  const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=(id|en)/);
  if (m) return m[1] as 'id' | 'en';
  const lang = navigator.language?.toLowerCase() ?? '';
  if (lang.startsWith('id')) return 'id';
  if (lang.startsWith('en')) return 'en';
  return 'id';
}

const COPY = {
  id: {
    title: 'Akses Ditolak',
    body: 'Anda tidak memiliki izin untuk mengakses halaman ini. Pastikan Anda sudah login dengan akun yang memiliki akses yang sesuai.',
    cta_back: 'Kembali',
    cta_login: 'Login',
    code_subtitle: 'Forbidden',
  },
  en: {
    title: 'Access Denied',
    body: 'You don\'t have permission to access this page. Make sure you are logged in with an account that has the appropriate access.',
    cta_back: 'Go Back',
    cta_login: 'Login',
    code_subtitle: 'Forbidden',
  },
};

export function ForbiddenPage() {
  const [locale, setLocale] = useState<'id' | 'en'>('id');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(readClientLocale());
  }, []);

  const copy = COPY[locale];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mb-6">
        <ShieldAlert className="h-9 w-9 text-rose-600 dark:text-rose-400" />
      </div>

      <p className="text-7xl sm:text-8xl font-display font-bold text-foreground/20 leading-none mb-2">403</p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{copy.title}</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-8">
        {copy.body}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <button
          onClick={() => {
            if (typeof window !== 'undefined') {
              window.history.back();
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> {copy.cta_back}
        </button>
        <Link
          href="/login"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 text-sm font-medium hover:bg-accent hover:border-amber-500/30 transition-colors"
        >
          <LogIn className="h-4 w-4" /> {copy.cta_login}
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12 font-mono uppercase tracking-wider">
        Error code: 403 &middot; {copy.code_subtitle}
      </p>
    </div>
  );
}
