export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { applyAffiliateLinks } from '@/lib/blog/affiliate-links';
import { injectInternalLinks, invalidateInternalLinkCache } from '@/lib/blog/internal-links';
import { createLogger } from '@/lib/logger';

const log = createLogger('admin/articles/apply-links');

/**
 * Re-apply affiliate + internal cross-link processing to ALL published
 * articles. Body markdown is rewritten in-place; no AI calls, no
 * regeneration of images or SEO meta. Idempotent — safe to re-run
 * after editing the Exness affiliate URL or after publishing new
 * articles.
 *
 * POST /api/admin/articles/apply-links
 */
export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

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
      const before = article.body;
      let body = await applyAffiliateLinks(article.body);
      const affiliatesBefore = (before.match(/\[Exness\]\(/g) ?? []).length;
      const affiliatesAfter = (body.match(/\[Exness\]\(/g) ?? []).length;
      const newAffiliates = Math.max(0, affiliatesAfter - affiliatesBefore);

      const { body: linkedBody, linkedSlugs } = await injectInternalLinks(body, {
        ownSlug: article.slug,
        maxLinks: 5,
      });
      body = linkedBody;

      // Same for body_en if present
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
