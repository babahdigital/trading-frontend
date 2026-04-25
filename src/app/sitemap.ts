import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db/prisma';
import { locales, defaultLocale } from '@/i18n/config';

const BASE_URL = 'https://babahalgo.com';

export const revalidate = 3600; // regenerate hourly so daily articles get indexed

const STATIC_PAGES: { path: string; priority: number; changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never' }[] = [
  { path: '/', priority: 1.0, changeFrequency: 'daily' },
  { path: '/platform', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/platform/technology', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/platform/risk-framework', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/platform/execution', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/platform/instruments', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platform/strategies/smc', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platform/strategies/wyckoff', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platform/strategies/astronacci', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platform/strategies/ai-momentum', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platform/strategies/oil-gas', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/platform/strategies/smc-swing', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/solutions/signal', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/solutions/pamm', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/solutions/institutional', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/performance', priority: 0.7, changeFrequency: 'daily' },
  { path: '/pricing', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/research', priority: 0.9, changeFrequency: 'daily' },
  { path: '/research/briefs', priority: 0.7, changeFrequency: 'daily' },
  { path: '/about', priority: 0.5, changeFrequency: 'monthly' },
  { path: '/about/team', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/about/governance', priority: 0.4, changeFrequency: 'monthly' },
  { path: '/contact', priority: 0.6, changeFrequency: 'monthly' },
  { path: '/register/signal', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/register/pamm', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/register/institutional', priority: 0.7, changeFrequency: 'weekly' },
  { path: '/legal/terms', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal/privacy', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal/risk-disclosure', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal/regulatory', priority: 0.3, changeFrequency: 'yearly' },
  { path: '/legal/cookies', priority: 0.3, changeFrequency: 'yearly' },
];

function buildAlternates(path: string): Record<string, string> {
  const alternates: Record<string, string> = {};
  for (const locale of locales) {
    alternates[locale] =
      locale === defaultLocale
        ? `${BASE_URL}${path}`
        : `${BASE_URL}/${locale}${path}`;
  }
  return alternates;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  // Static pages
  for (const { path, priority, changeFrequency } of STATIC_PAGES) {
    entries.push({
      url: `${BASE_URL}${path}`,
      lastModified: new Date(),
      changeFrequency,
      priority,
      alternates: { languages: buildAlternates(path) },
    });
  }

  // Dynamic: published articles (parallel-fetch from DB; tolerate failure)
  try {
    const articles = await prisma.article.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
    });
    for (const article of articles) {
      const path = `/research/${article.slug}`;
      const isDaily = article.slug.startsWith('daily-');
      entries.push({
        url: `${BASE_URL}${path}`,
        lastModified: article.updatedAt ?? article.publishedAt ?? new Date(),
        changeFrequency: isDaily ? 'never' : 'monthly',
        priority: isDaily ? 0.6 : 0.8,
        alternates: { languages: buildAlternates(path) },
      });
    }
  } catch {
    // DB unreachable during build — fall back to static-only sitemap
  }

  // Dynamic: published pair briefs
  try {
    const briefs = await prisma.pairBrief.findMany({
      where: { isPublished: true },
      select: { slug: true, updatedAt: true, publishedAt: true },
      orderBy: { publishedAt: 'desc' },
      take: 200, // briefs accumulate fast — cap for sitemap budget
    });
    for (const brief of briefs) {
      const path = `/research/briefs/${brief.slug}`;
      entries.push({
        url: `${BASE_URL}${path}`,
        lastModified: brief.updatedAt ?? brief.publishedAt ?? new Date(),
        changeFrequency: 'never',
        priority: 0.5,
        alternates: { languages: buildAlternates(path) },
      });
    }
  } catch {
    // tolerate
  }

  return entries;
}
