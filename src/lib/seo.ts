import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import type { Metadata } from 'next';

const log = createLogger('lib/seo');

interface PageMetaResult {
  metadata: Metadata;
  structuredData?: Record<string, unknown>;
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
  // EN locale: bypass DB until PageMeta gains _en columns. Caller's fallback
  // is the source of truth for English copy.
  if (locale === 'en') {
    return { metadata: fallback };
  }

  try {
    const meta = await prisma.pageMeta.findUnique({ where: { path } });
    if (meta) {
      return {
        metadata: {
          title: meta.title,
          description: meta.description,
          openGraph: {
            title: meta.ogTitle || meta.title,
            description: meta.ogDescription || meta.description || undefined,
            images: meta.ogImage ? [meta.ogImage] : undefined,
          },
        },
        structuredData: meta.structuredData as Record<string, unknown> | undefined,
      };
    }
  } catch (err) {
    log.warn(`PageMeta read failed for ${path}: ${err instanceof Error ? err.message : 'unknown'}`);
  }
  return { metadata: fallback };
}
