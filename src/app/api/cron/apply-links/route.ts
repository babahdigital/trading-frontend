export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { applyAffiliateLinks } from '@/lib/blog/affiliate-links';
import { injectInternalLinks, invalidateInternalLinkCache } from '@/lib/blog/internal-links';
import { createLogger } from '@/lib/logger';

const log = createLogger('cron/apply-links');

/**
 * Cron-secret-gated variant of /api/admin/articles/apply-links.
 * Convenience for ops/automation that doesn't carry admin JWT — only
 * the CRON_SECRET. Same idempotent backfill: replays affiliate-link
 * + internal-link injectors against every published Article body.
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

  invalidateInternalLinkCache();

  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    select: { id: true, slug: true, body: true, body_en: true },
  });

  let affected = 0;
  let linkedTotal = 0;
  let affiliatesTotal = 0;

  for (const article of articles) {
    try {
      const bodyAffilBefore = (article.body.match(/\[Exness\]\(/g) ?? []).length;
      let body = await applyAffiliateLinks(article.body);
      const bodyAffilAfter = (body.match(/\[Exness\]\(/g) ?? []).length;
      const newAffiliates = Math.max(0, bodyAffilAfter - bodyAffilBefore);

      const { body: linkedBody, linkedSlugs } = await injectInternalLinks(body, {
        ownSlug: article.slug,
        maxLinks: 5,
      });
      body = linkedBody;

      let body_en = article.body_en;
      if (body_en) {
        body_en = await applyAffiliateLinks(body_en);
        const enLinked = await injectInternalLinks(body_en, {
          ownSlug: article.slug,
          maxLinks: 5,
          localePrefix: '/en',
        });
        body_en = enLinked.body;
      }

      if (body !== article.body || body_en !== article.body_en) {
        await prisma.article.update({
          where: { id: article.id },
          data: { body, ...(body_en ? { body_en } : {}) },
        });
        affected += 1;
      }

      linkedTotal += linkedSlugs.length;
      affiliatesTotal += newAffiliates;
    } catch (err) {
      log.warn(`apply-links failed for ${article.slug}: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  return NextResponse.json({
    status: 'ok',
    processed: articles.length,
    affected,
    linkedTotal,
    affiliatesTotal,
  });
}

export const POST = GET;
