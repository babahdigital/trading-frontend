'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';
import { readClientLocale } from '@/lib/locale/client-detect';

const COPY = {
  id: {
    title: 'Terjadi Kesalahan',
    body: 'Sistem mengalami gangguan saat memproses permintaan Anda. Tim kami otomatis mendapat notifikasi.',
    error_id_label: 'Error ID',
    cta_retry: 'Coba Lagi',
    cta_home: 'Kembali ke Beranda',
    support_pre: 'Hubungi',
    support_link: 'support',
    support_post: 'jika masalah berlanjut.',
  },
  en: {
    title: 'Something went wrong',
    body: 'Our system encountered an issue while processing your request. Our team has been automatically notified.',
    error_id_label: 'Error ID',
    cta_retry: 'Try Again',
    cta_home: 'Back to Home',
    support_pre: 'Contact',
    support_link: 'support',
    support_post: 'if the issue persists.',
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<'id' | 'en'>('id');

  useEffect(() => {
    // Sync locale dari cookie/navigator setelah hydration — pakai effect untuk
    // hindari SSR/client mismatch (SSR default 'id', client baca cookie).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(readClientLocale());
    if (process.env.NODE_ENV !== 'production') {
      console.error('[global-error]', error);
    }
  }, [error]);

  const copy = COPY[locale];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mb-6">
        <AlertOctagon className="h-9 w-9 text-rose-600 dark:text-rose-400" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{copy.title}</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-2">
        {copy.body}
      </p>
      {error.digest && (
        <p className="text-[11px] text-muted-foreground/70 font-mono mb-8">
          {copy.error_id_label}: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> {copy.cta_retry}
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Home className="h-4 w-4" /> {copy.cta_home}
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12">
        {copy.support_pre} <Link href="/contact" className="text-amber-400 hover:underline">{copy.support_link}</Link> {copy.support_post}
      </p>
    </div>
  );
}
