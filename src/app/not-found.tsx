import Link from 'next/link';
import Image from 'next/image';
import { Compass, Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <Link href="/" aria-label="BabahAlgo home" className="mb-12 opacity-90 hover:opacity-100 transition-opacity">
        <Image
          src="/logo/babahalgo-header-dark.png"
          alt="BabahAlgo"
          width={160}
          height={32}
          className="h-8 w-auto hidden dark:block"
          priority
        />
        <Image
          src="/logo/babahalgo-header-light.png"
          alt="BabahAlgo"
          width={160}
          height={32}
          className="h-8 w-auto dark:hidden"
          priority
        />
      </Link>

      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/30 mb-6">
        <Compass className="h-9 w-9 text-amber-400" />
      </div>

      <p className="text-7xl sm:text-8xl font-display font-bold text-foreground/20 leading-none mb-2">404</p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">Halaman tidak ditemukan</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-8">
        Halaman yang Anda cari mungkin sudah dipindahkan, dihapus, atau tidak pernah ada. Silakan kembali ke beranda
        atau hubungi tim kami jika Anda yakin ini adalah kesalahan.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" /> Kembali ke Beranda
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 text-sm font-medium hover:bg-accent hover:border-amber-500/30 transition-colors"
        >
          Laporkan masalah <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12 font-mono uppercase tracking-wider">
        Error code: 404 · Resource not found
      </p>
    </div>
  );
}
