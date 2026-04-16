'use client';

import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

interface GuestNavProps {
  activePath?: string;
}

export function GuestNav({ activePath }: GuestNavProps) {
  const t = useTranslations('nav');

  const links = [
    { href: '/features' as const, label: t('features') },
    { href: '/pricing' as const, label: t('pricing') },
    { href: '/faq' as const, label: t('faq') },
  ];

  return (
    <nav className="border-b border-border/40 bg-background/95 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-primary">BabahAlgo</Link>
        <div className="flex items-center gap-4">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`text-sm hidden sm:inline ${
                activePath === href
                  ? 'text-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              } transition-colors`}
            >
              {label}
            </Link>
          ))}
          <LanguageSwitcher />
          <Link
            href="/login"
            className="text-sm px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            {t('login')}
          </Link>
        </div>
      </div>
    </nav>
  );
}
