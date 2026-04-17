import type { MetadataRoute } from 'next';
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://babahalgo.com';

const STATIC_PAGES = [
  '/',
  '/platform',
  '/platform/technology',
  '/platform/risk-framework',
  '/platform/execution',
  '/platform/instruments',
  '/platform/strategies/smc',
  '/platform/strategies/wyckoff',
  '/platform/strategies/astronacci',
  '/platform/strategies/ai-momentum',
  '/platform/strategies/oil-gas',
  '/platform/strategies/smc-swing',
  '/solutions/signal',
  '/solutions/pamm',
  '/solutions/institutional',
  '/performance',
  '/pricing',
  '/research',
  '/about',
  '/about/team',
  '/about/governance',
  '/contact',
  '/register/signal',
  '/register/pamm',
  '/register/institutional',
  '/legal/terms',
  '/legal/privacy',
  '/legal/risk-disclosure',
  '/legal/regulatory',
  '/legal/cookies',
];

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const page of STATIC_PAGES) {
    const alternates: Record<string, string> = {};
    for (const locale of locales) {
      alternates[locale] =
        locale === defaultLocale
          ? `${BASE_URL}${page}`
          : `${BASE_URL}/${locale}${page}`;
    }

    entries.push({
      url: `${BASE_URL}${page}`,
      lastModified: new Date(),
      changeFrequency: page === '/performance' ? 'daily' : 'weekly',
      priority: page === '/' ? 1.0 : page.startsWith('/platform') || page.startsWith('/solutions') ? 0.8 : 0.6,
      alternates: { languages: alternates },
    });
  }

  return entries;
}
