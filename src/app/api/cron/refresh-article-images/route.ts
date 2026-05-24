import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateArticleImage } from '@/lib/ai/image-generator';
import { verifyCronSecret } from '@/lib/auth/cron';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('cron/refresh-article-images');

/**
 * Bulk refresh hero image untuk artikel existing.
 *
 * Re-run generateArticleImage() dengan prompt revamp (editorial illustration
 * style ala FT/HBR, no fake chart/hallu — replace Bloomberg trading terminal
 * photography style sebelumnya yang sering output gambar jelek).
 *
 * Auth: x-cron-secret header atau ?secret=<CRON_SECRET> query param.
 *
 * Query params:
 *   limit       — max article di-process per call (default 5, max 20).
 *                 Pollinations.ai ~60-90s per image; 5 articles = 5-8 menit per call.
 *   only_null   — true: cuma artikel dengan imageUrl null (skip yang sudah ada).
 *                 false: replace ALL (regenerate semua, pakai prompt baru).
 *                 Default: true (safer, idempotent untuk re-call berkali-kali).
 *   slug        — regenerate specific slug (override limit, ignore only_null).
 *
 * Idempotent: aman di-call berkali-kali. Skip article yang sudah punya image
 * kecuali only_null=false atau slug spesifik.
 */

interface ProcessResult {
  slug: string;
  status: 'regenerated' | 'skipped' | 'failed';
  sizeBytes?: number;
  reason?: string;
}

export async function POST(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') ?? '5', 10), 1), 20);
  const onlyNull = url.searchParams.get('only_null') !== 'false';
  const targetSlug = url.searchParams.get('slug');

  const startTs = Date.now();

  // Build query: published + optional imageUrl IS NULL + optional slug match
  const where = targetSlug
    ? { slug: targetSlug, isPublished: true }
    : onlyNull
      ? { isPublished: true, imageUrl: null }
      : { isPublished: true };

  let articles;
  try {
    articles = await prisma.article.findMany({
      where,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        keywords: true,
      },
      orderBy: { publishedAt: 'desc' },
      take: targetSlug ? 1 : limit,
    });
  } catch (err) {
    log.error(`Article query failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return NextResponse.json({ code: 'internal_error', error: 'db_failure' }, { status: 500 });
  }

  if (articles.length === 0) {
    return NextResponse.json({
      status: 'ok',
      processed: 0,
      results: [],
      message: targetSlug
        ? `Article slug=${targetSlug} not found or not published`
        : onlyNull
          ? 'All published articles already have images. Pass only_null=false to force regen.'
          : 'No published articles found.',
    });
  }

  const results: ProcessResult[] = [];

  for (const article of articles) {
    try {
      const keywords = Array.isArray(article.keywords) ? (article.keywords as string[]) : undefined;
      const image = await generateArticleImage(article.title, {
        category: article.category,
        keywords,
        slug: article.slug,
      });
      if (!image) {
        results.push({ slug: article.slug, status: 'failed', reason: 'image_generator_returned_null' });
        continue;
      }
      await prisma.article.update({
        where: { id: article.id },
        data: { imageUrl: image.dataUri },
      });
      results.push({ slug: article.slug, status: 'regenerated', sizeBytes: image.sizeBytes });
      log.info(`Refreshed image for ${article.slug} (${image.sizeBytes} bytes)`);
    } catch (err) {
      results.push({
        slug: article.slug,
        status: 'failed',
        reason: err instanceof Error ? err.message : 'unknown',
      });
      log.warn(`Refresh failed for ${article.slug}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  const elapsedSec = Math.round((Date.now() - startTs) / 1000);

  return NextResponse.json({
    status: 'ok',
    processed: results.length,
    elapsed_seconds: elapsedSec,
    results,
    next_action: onlyNull
      ? 'Re-call this endpoint to process next batch (idempotent, skips done articles).'
      : 'Force-replace mode: all articles will be re-processed across multiple calls.',
  });
}

// GET alias supaya bisa dipanggil dari cron service (Vercel cron, github action,
// dll) yang biasanya pakai GET.
export const GET = POST;
