export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { generateSeoMeta } from '@/lib/ai/seo-meta';
import { createLogger } from '@/lib/logger';

const log = createLogger('backfill-seo-meta');

/**
 * Backfill SEO meta (metaTitle + metaDescription) for existing
 * Articles that have NULL meta fields. Single AI call per article
 * (~5 seconds, ~$0.001 cost). Idempotent — only processes rows
 * still missing the field.
 *
 * Query params:
 *   max     — cap rows per run (default 20)
 *   force   — '1' to overwrite even if already set
 */

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && header === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const maxRaw = request.nextUrl.searchParams.get('max');
  const max = Math.max(1, Math.min(50, maxRaw ? parseInt(maxRaw, 10) : 20));
  const force = request.nextUrl.searchParams.get('force') === '1';

  const articles = await prisma.article.findMany({
    where: {
      isPublished: true,
      ...(force ? {} : { OR: [{ metaTitle: null }, { metaDescription: null }] }),
    },
    select: {
      id: true, slug: true, title: true, title_en: true,
      excerpt: true, excerpt_en: true, category: true,
      keywords: true,
      metaTitle: true, metaTitle_en: true,
    },
    orderBy: { publishedAt: 'desc' },
    take: max,
  });

  if (articles.length === 0) {
    return NextResponse.json({
      status: 'ok',
      message: 'no articles needing backfill',
      processed: 0,
    });
  }

  let succeeded = 0;
  let failed = 0;
  const results: Array<{ slug: string; status: string; error?: string }> = [];

  for (const article of articles) {
    try {
      const keywordsArr = Array.isArray(article.keywords) ? (article.keywords as string[]) : [];

      const [seoId, seoEn] = await Promise.all([
        generateSeoMeta({
          title: article.title,
          excerpt: article.excerpt,
          category: article.category,
          keywords: keywordsArr,
          language: 'id',
        }),
        article.title_en
          ? generateSeoMeta({
              title: article.title_en,
              excerpt: article.excerpt_en ?? article.excerpt,
              category: article.category,
              keywords: keywordsArr,
              language: 'en',
            })
          : Promise.resolve(null),
      ]);

      if (!seoId && !seoEn) {
        results.push({ slug: article.slug, status: 'skipped', error: 'AI returned null both languages' });
        failed += 1;
        continue;
      }

      await prisma.article.update({
        where: { id: article.id },
        data: {
          ...(seoId ? { metaTitle: seoId.metaTitle, metaDescription: seoId.metaDescription } : {}),
          ...(seoEn ? { metaTitle_en: seoEn.metaTitle, metaDescription_en: seoEn.metaDescription } : {}),
        },
      });

      results.push({ slug: article.slug, status: 'ok' });
      succeeded += 1;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown';
      log.warn(`Backfill failed for ${article.slug}: ${msg}`);
      results.push({ slug: article.slug, status: 'error', error: msg });
      failed += 1;
    }
  }

  return NextResponse.json({
    status: 'ok',
    processed: articles.length,
    succeeded,
    failed,
    results,
  });
}

export const POST = GET;
