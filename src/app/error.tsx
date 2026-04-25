'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.error('[global-error]', error);
    }
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/30 mb-6">
        <AlertOctagon className="h-9 w-9 text-red-400" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Terjadi Kesalahan</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-2">
        Sistem mengalami gangguan saat memproses permintaan Anda. Tim kami otomatis mendapat notifikasi.
      </p>
      {error.digest && (
        <p className="text-[11px] text-muted-foreground/70 font-mono mb-8">
          Error ID: {error.digest}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto mt-4">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" /> Coba Lagi
        </button>
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Home className="h-4 w-4" /> Kembali ke Beranda
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12">
        Hubungi <Link href="/contact" className="text-amber-400 hover:underline">support</Link> jika masalah berlanjut.
      </p>
    </div>
  );
}
