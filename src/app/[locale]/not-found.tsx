import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Compass, Home, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/layout/brand-logo';

export default async function LocaleNotFound() {
  const t = await getTranslations('not_found');

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 text-center bg-background">
      <Link href="/" aria-label={t('logo_alt')} className="mb-12 opacity-90 hover:opacity-100 transition-opacity">
        <BrandLogo height={32} priority alt={t('logo_alt')} />
      </Link>

      <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 border border-primary/30 mb-6">
        <Compass className="h-9 w-9 text-[hsl(var(--primary))]" />
      </div>

      <p className="text-7xl sm:text-8xl font-display font-bold text-foreground/20 leading-none mb-2">404</p>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-3">{t('title')}</h1>
      <p className="text-muted-foreground max-w-md leading-relaxed mb-8">
        {t('body')}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" /> {t('cta_home')}
        </Link>
        <Link
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md border border-border text-sm font-medium hover:bg-muted hover:border-primary/30 transition-colors"
        >
          {t('cta_report')} <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <p className="text-xs text-muted-foreground/60 mt-12 font-mono uppercase tracking-wider">
        Error code: 404 · {t('code_subtitle')}
      </p>
    </div>
  );
}
