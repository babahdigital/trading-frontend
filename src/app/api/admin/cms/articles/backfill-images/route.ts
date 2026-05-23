export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { generateArticleImage } from '@/lib/ai/image-generator';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin/backfill-images');

/**
 * Admin backfill route: generate Pollinations cover images + patch SEO
 * meta for published articles that are missing them.
 *
 * GET /api/admin/cms/articles/backfill-images
 *   ?limit=5        — max articles per run (default 5, max 20)
 *   ?force=1        — also replace articles that already have images
 *   ?seo=1          — also backfill metaTitle/metaDescription from title/excerpt
 *
 * Auth: admin JWT (via requireAdmin).
 *
 * Image: uses existing generateArticleImage() which fetches from Pollinations
 * and returns base64 data URI. ~45-60s per image on free tier.
 *
 * SEO backfill (when ?seo=1):
 *   - metaTitle null  -> first 60 chars of title, cleanly truncated at word boundary
 *   - metaDescription null -> first 155 chars of excerpt, cleanly truncated
 *   - Same for _en variants when title_en/excerpt_en exist
 * This is a lightweight fallback that does NOT call the AI — it derives meta
 * from existing content. For AI-powered SEO meta, use /api/cron/backfill-seo-meta.
 */

interface BackfillResult {
  slug: string;
  imageStatus: 'generated' | 'skipped' | 'failed' | 'had_image';
  seoStatus?: 'patched' | 'skipped' | 'had_meta';
  imageSizeBytes?: number;
  error?: string;
}

/**
 * Truncate text to maxLen at a word boundary, appending ellipsis if truncated.
 */
function truncateAtWord(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  const truncated = text.slice(0, maxLen);
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxLen * 0.6) {
    return truncated.slice(0, lastSpace).replace(/[,;:\s]+$/, '') + '...';
  }
  return truncated.replace(/[,;:\s]+$/, '') + '...';
}

export async function GET(request: NextRequest) {
  // Dual auth: admin JWT OR cron secret (for automated backfill)
  const cronSecret = request.headers.get('x-cron-secret');
  const validCron = cronSecret && process.env.CRON_SECRET && cronSecret === process.env.CRON_SECRET;
  if (!validCron) {
    const denied = requireAdmin(request);
    if (denied) return denied;
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '5', 10), 1), 20);
  const force = url.searchParams.get('force') === '1';
  const backfillSeo = url.searchParams.get('seo') === '1';

  const startTs = Date.now();

  // Find published articles missing imageUrl (or all if force)
  const where = force
    ? { isPublished: true }
    : { isPublished: true, imageUrl: null };

  let articles;
  try {
    articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        title_en: true,
        excerpt: true,
        excerpt_en: true,
        category: true,
        keywords: true,
        imageUrl: true,
        metaTitle: true,
        metaTitle_en: true,
        metaDescription: true,
        metaDescription_en: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });
  } catch (err) {
    log.error(`DB query failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'db_failure' }, { status: 500 });
  }

  if (articles.length === 0) {
    return NextResponse.json({
      status: 'ok',
      processed: 0,
      results: [],
      message: force
        ? 'No published articles found.'
        : 'All published articles already have images. Pass force=1 to regenerate.',
    });
  }

  const results: BackfillResult[] = [];

  for (const article of articles) {
    const result: BackfillResult = {
      slug: article.slug,
      imageStatus: 'skipped',
    };

    // --- Image generation ---
    const needsImage = !article.imageUrl || force;
    if (needsImage) {
      try {
        const keywords = Array.isArray(article.keywords) ? (article.keywords as string[]) : undefined;
        const image = await generateArticleImage(article.title, {
          category: article.category,
          keywords,
          slug: article.slug,
        });

        if (!image) {
          result.imageStatus = 'failed';
          result.error = 'image_generator_returned_null';
        } else {
          await prisma.article.update({
            where: { id: article.id },
            data: { imageUrl: image.dataUri },
          });
          result.imageStatus = 'generated';
          result.imageSizeBytes = image.sizeBytes;
          log.info(`Backfilled image for ${article.slug} (${image.sizeBytes} bytes)`);
        }
      } catch (err) {
        result.imageStatus = 'failed';
        result.error = err instanceof Error ? err.message : 'unknown';
        log.warn(`Image backfill failed for ${article.slug}: ${result.error}`);
      }
    } else {
      result.imageStatus = 'had_image';
    }

    // --- SEO meta backfill (lightweight, no AI call) ---
    if (backfillSeo) {
      const updates: Record<string, string> = {};

      if (!article.metaTitle && article.title) {
        updates.metaTitle = truncateAtWord(article.title, 60);
      }
      if (!article.metaDescription && article.excerpt) {
        updates.metaDescription = truncateAtWord(article.excerpt, 155);
      }
      if (!article.metaTitle_en && article.title_en) {
        updates.metaTitle_en = truncateAtWord(article.title_en, 60);
      }
      if (!article.metaDescription_en && article.excerpt_en) {
        updates.metaDescription_en = truncateAtWord(article.excerpt_en, 155);
      }

      if (Object.keys(updates).length > 0) {
        try {
          await prisma.article.update({
            where: { id: article.id },
            data: updates,
          });
          result.seoStatus = 'patched';
          log.info(`Backfilled SEO meta for ${article.slug}: ${Object.keys(updates).join(', ')}`);
        } catch (err) {
          result.seoStatus = 'skipped';
          log.warn(`SEO backfill DB update failed for ${article.slug}: ${err instanceof Error ? err.message : 'unknown'}`);
        }
      } else {
        result.seoStatus = 'had_meta';
      }
    }

    results.push(result);
  }

  const elapsedSec = Math.round((Date.now() - startTs) / 1000);
  const generated = results.filter((r) => r.imageStatus === 'generated').length;
  const failed = results.filter((r) => r.imageStatus === 'failed').length;
  const seoPatched = results.filter((r) => r.seoStatus === 'patched').length;

  return NextResponse.json({
    status: 'ok',
    processed: results.length,
    images: { generated, failed, skipped: results.length - generated - failed },
    ...(backfillSeo ? { seo: { patched: seoPatched } } : {}),
    elapsed_seconds: elapsedSec,
    results,
  });
}

export const POST = GET;
