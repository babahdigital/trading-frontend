export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('cleanup-stale-articles');

/**
 * Soft-unpublish stale low-quality articles.
 *
 * Targets: legacy seed articles from before the AI generator pipeline
 * (typically <3000 chars body, not linked to a BlogTopic). Default mode
 * is soft-unpublish (isPublished=false, publishedAt=null) so the row is
 * preserved for audit and the action is reversible.
 *
 * Query params:
 *   minLength    — body length threshold (default 3000)
 *   olderThanDays — minimum age in days (default 0 — no age check)
 *   delete       — '1' to hard-delete instead of soft-unpublish
 *   dryRun       — '1' to return candidates without mutating
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

  const minLength = parseInt(request.nextUrl.searchParams.get('minLength') ?? '3000', 10);
  const olderThanDays = parseInt(request.nextUrl.searchParams.get('olderThanDays') ?? '0', 10);
  const hardDelete = request.nextUrl.searchParams.get('delete') === '1';
  const dryRun = request.nextUrl.searchParams.get('dryRun') === '1';

  // Find candidates: short body + not linked to BlogTopic + older than threshold
  const cutoffDate = olderThanDays > 0
    ? new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000)
    : new Date();

  const allShortArticles = await prisma.article.findMany({
    where: {
      isPublished: true,
      ...(olderThanDays > 0 ? { createdAt: { lte: cutoffDate } } : {}),
    },
    select: {
      id: true, slug: true, title: true, body: true,
      createdAt: true, sourceTopic: { select: { id: true } },
    },
  });

  const candidates = allShortArticles.filter(
    (a) => a.body.length < minLength && !a.sourceTopic,
  );

  if (dryRun) {
    return NextResponse.json({
      dryRun: true,
      threshold: { minLength, olderThanDays },
      candidates: candidates.map((a) => ({
        slug: a.slug,
        title: a.title,
        bodyLength: a.body.length,
        createdAt: a.createdAt,
      })),
      candidateCount: candidates.length,
    });
  }

  let affected = 0;
  const processed: string[] = [];

  for (const article of candidates) {
    try {
      if (hardDelete) {
        await prisma.article.delete({ where: { id: article.id } });
      } else {
        await prisma.article.update({
          where: { id: article.id },
          data: { isPublished: false, publishedAt: null },
        });
      }
      affected += 1;
      processed.push(article.slug);
    } catch (err) {
      log.warn(`Failed to process ${article.slug}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  log.info(`Cleanup: ${affected} articles ${hardDelete ? 'deleted' : 'soft-unpublished'}`);

  return NextResponse.json({
    status: 'ok',
    mode: hardDelete ? 'delete' : 'soft-unpublish',
    threshold: { minLength, olderThanDays },
    affected,
    processed,
  });
}

export const POST = GET;
