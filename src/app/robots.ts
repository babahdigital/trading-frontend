import type { MetadataRoute } from 'next';

const BASE_URL = 'https://babahalgo.com';

/**
 * Dynamic robots.txt per Next.js Metadata API.
 *
 * Allows public + research content for indexing; blocks app surfaces
 * that aren't useful for crawlers (auth, admin, portal, API routes).
 * References the dynamic sitemap so search engines discover daily
 * articles + pair briefs as they get published.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/research/', '/research/briefs/'],
        disallow: [
          '/api/',
          '/admin/',
          '/portal/',
          '/login',
          '/_next/',
          '/uploads/',
        ],
      },
      {
        // Block AI training crawlers — content is institutional and we
        // don't want it scraped into LLM training datasets.
        userAgent: ['GPTBot', 'CCBot', 'anthropic-ai', 'ClaudeBot', 'Google-Extended'],
        disallow: ['/'],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL,
  };
}
