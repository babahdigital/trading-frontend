import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { verifyCronSecret } from '@/lib/auth/cron';
import { generateThumbnail } from '@/lib/ai/thumbnail';
import { createLogger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const log = createLogger('cron/backfill-thumbnails');

export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '5', 10), 20);

  const articles = await prisma.article.findMany({
    where: {
      isPublished: true,
      imageUrl: { not: null },
      thumbnailUrl: null,
    },
    select: { id: true, slug: true, imageUrl: true },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });

  if (articles.length === 0) {
    return NextResponse.json({ status: 'ok', processed: 0, message: 'All articles have thumbnails' });
  }

  const results: Array<{ slug: string; status: string; sizeKb?: number }> = [];

  for (const article of articles) {
    if (!article.imageUrl) continue;
    const thumb = await generateThumbnail(article.imageUrl);
    if (thumb) {
      await prisma.article.update({
        where: { id: article.id },
        data: { thumbnailUrl: thumb },
      });
      const sizeKb = Math.round(Buffer.from(thumb.split(',')[1] ?? '', 'base64').length / 1024);
      results.push({ slug: article.slug, status: 'ok', sizeKb });
      log.info(`Backfilled thumbnail for ${article.slug} (${sizeKb}KB)`);
    } else {
      results.push({ slug: article.slug, status: 'failed' });
    }
  }

  return NextResponse.json({ status: 'ok', processed: results.length, results });
}
