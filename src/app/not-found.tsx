import Link from 'next/link';
import Image from 'next/image';
import { cookies, headers } from 'next/headers';
import { Compass, Home, ArrowRight } from 'lucide-react';

/**
 * Root 404 — fallback when no locale segment matched. Detects locale via
 * (1) NEXT_LOCALE cookie set by geo-IP middleware, (2) Accept-Language
 * header, (3) defaults to 'id'. Pages under /[locale]/ have their own
 * locale-aware not-found.tsx that uses next-intl's getTranslations.
 */
async function detectLocale(): Promise<'id' | 'en'> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('NEXT_LOCALE')?.value;
  if (cookieLocale === 'en' || cookieLocale === 'id') return cookieLocale;

  const headerStore = await headers();
  const acceptLang = headerStore.get('accept-language') ?? '';
  const langs = acceptLang.split(',').map((s) => s.split(';')[0].trim().toLowerCase());
  const primary = langs[0] ?? '';
  if (primary.startsWith('id')) return 'id';
  if (primary.startsWith('en')) return 'en';
  return 'id';
}

const COPY = {
  id: {
    title: 'Halaman tidak ditemukan',
    body: 'Halaman yang Anda cari mungkin sudah dipindahkan, dihapus, atau tidak pernah ada. Silakan kembali ke beranda atau hubungi tim kami jika Anda yakin ini adalah kesalahan.',
    cta_home: 'Kembali ke Beranda',
    cta_report: 'Laporkan masalah',
    code_subtitle: 'Resource not found',
    logo_alt: 'Beranda BabahAlgo',
  },
  en: {
    title: 'Page not found',
    body: 'The page you\'re looking for may have been moved, removed, or never existed. Return to the homepage or contact our team if you believe this is an error.',
    cta_home: 'Back to Home',
    cta_report: 'Report an issue',
    code_subtitle: 'Resource not found',
    logo_alt: 'BabahAlgo home',
  },
};

export default async function NotFound() {
  const locale = await detectLocale();
  const copy = COPY[locale];
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <Link href="/" aria-label={copy.logo_alt} className="mb-12 opacity-90 hover:opacity-100 transition-opacity">
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
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{copy.title}</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-8">
        {copy.body}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" /> {copy.cta_home}
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-white/15 text-sm font-medium hover:bg-accent hover:border-amber-500/30 transition-colors"
        >
          {copy.cta_report} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12 font-mono uppercase tracking-wider">
        Error code: 404 · {copy.code_subtitle}
      </p>
    </div>
  );
}
