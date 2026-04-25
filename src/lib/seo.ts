import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';
import type { Metadata } from 'next';

const log = createLogger('lib/seo');

interface PageMetaResult {
  metadata: Metadata;
  structuredData?: Record<string, unknown>;
}

export async function getPageMetadata(path: string, fallback: { title: string; description: string }): Promise<Metadata> {
  const result = await getPageMetadataWithStructuredData(path, fallback);
  return result.metadata;
}

export async function getPageMetadataWithStructuredData(path: string, fallback: { title: string; description: string }): Promise<PageMetaResult> {
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
