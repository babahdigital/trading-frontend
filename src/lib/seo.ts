import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import type { Metadata } from 'next';

const log = createLogger('lib/seo');

interface PageMetaResult {
  metadata: Metadata;
  structuredData?: Record<string, unknown>;
}

// Default OG image untuk pages tanpa custom ogImage di PageMeta DB.
// Path relative — resolved against metadataBase di root layout.
const DEFAULT_OG_IMAGE = {
  url: '/logo/babahalgo-icon-1024.png',
  width: 1024,
  height: 1024,
  alt: 'BabahAlgo — Institutional-grade Quantitative Trading',
} as const;

/**
 * Build canonical openGraph + twitter metadata pair untuk page.
 * Used baik di DB-driven path maupun fallback path supaya semua surface
 * dapat full OG + Twitter card konsisten.
 */
function buildSocialCard(opts: {
  title: string;
  description: string;
  url?: string;
  image?: string;
  type?: 'website' | 'article';
}) {
  const image = opts.image || DEFAULT_OG_IMAGE.url;
  return {
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.url,
      siteName: 'BabahAlgo',
      type: opts.type ?? 'website',
      locale: 'id_ID',
      images: [
        {
          url: image,
          width: image === DEFAULT_OG_IMAGE.url ? DEFAULT_OG_IMAGE.width : 1200,
          height: image === DEFAULT_OG_IMAGE.url ? DEFAULT_OG_IMAGE.height : 630,
          alt: image === DEFAULT_OG_IMAGE.url ? DEFAULT_OG_IMAGE.alt : opts.title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: opts.title,
      description: opts.description,
      images: [image],
    },
  };
}

/**
 * Resolve page SEO metadata with locale awareness.
 *
 * Strategy:
 * - ID locale (default): prefer admin-managed PageMeta DB row, else use
 *   `fallback` (caller's Indonesian copy from generateMetadata).
 * - EN locale: bypass DB (currently ID-only) and use `fallback` directly.
 *   Callers should pass English copy when serving EN.
 *
 * Future: when PageMeta gains title_en/description_en columns + worker
 * auto-translate (mirroring Faq/PricingTier zero-touch pattern), the EN
 * branch will read DB just like ID. Tracked as backlog.
 */
export async function getPageMetadata(
  path: string,
  fallback: { title: string; description: string },
  locale?: 'id' | 'en',
): Promise<Metadata> {
  const result = await getPageMetadataWithStructuredData(path, fallback, locale);
  return result.metadata;
}

export async function getPageMetadataWithStructuredData(
  path: string,
  fallback: { title: string; description: string },
  locale?: 'id' | 'en',
): Promise<PageMetaResult> {
  try {
    const meta = await prisma.pageMeta.findUnique({ where: { path } });
    if (meta) {
      const isEn = locale === 'en';
      // Resolve EN columns when available; fall back to ID columns then
      // caller fallback. Worker auto-translates blank EN columns next tick.
      const title = (isEn && meta.title_en) ? meta.title_en : meta.title;
      const description = (isEn && meta.description_en)
        ? meta.description_en
        : meta.description;
      const ogTitle = (isEn && meta.ogTitle_en)
        ? meta.ogTitle_en
        : (meta.ogTitle || title);
      const ogDescription = (isEn && meta.ogDescription_en)
        ? meta.ogDescription_en
        : (meta.ogDescription || description || undefined);

      // EN locale + EN column missing → caller fallback wins (avoid serving
      // ID copy on EN page). Worker will fill in next tick.
      if (isEn && !meta.title_en && !meta.description_en) {
        return {
          metadata: {
            ...fallback,
            ...buildSocialCard({
              title: fallback.title,
              description: fallback.description,
              url: path,
            }),
          },
        };
      }

      const social = buildSocialCard({
        title: ogTitle,
        description: ogDescription || description || '',
        url: path,
        image: meta.ogImage ?? undefined,
      });

      return {
        metadata: {
          title,
          description,
          ...social,
        },
        structuredData: meta.structuredData as Record<string, unknown> | undefined,
      };
    }
  } catch (err) {
    log.warn(`PageMeta read failed for ${path}: ${err instanceof Error ? err.message : 'unknown'}`);
  }
  return {
    metadata: {
      ...fallback,
      ...buildSocialCard({
        title: fallback.title,
        description: fallback.description,
        url: path,
      }),
    },
  };
}
