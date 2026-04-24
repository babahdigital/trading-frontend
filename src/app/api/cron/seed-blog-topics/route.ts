import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { TOPIC_CATALOG, topicSpecToPrismaCreate } from '@/lib/blog/topic-catalog';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function authorized(req: NextRequest): boolean {
  const header = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const expected = process.env.CRON_SECRET;
  return !!expected && header === expected;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const seeded: string[] = [];
  const updated: string[] = [];

  for (const spec of TOPIC_CATALOG) {
    const existing = await prisma.blogTopic.findUnique({ where: { slug: spec.slug } });
    const create = topicSpecToPrismaCreate(spec);

    if (existing) {
      // Update prompt/excerpt/metadata but do NOT reset status or articleId
      await prisma.blogTopic.update({
        where: { slug: spec.slug },
        data: {
          titleId: create.titleId,
          titleEn: create.titleEn,
          excerptId: create.excerptId,
          excerptEn: create.excerptEn,
          promptTemplate: create.promptTemplate,
          dataSources: create.dataSources,
          keywords: create.keywords,
          category: create.category,
          assetClass: create.assetClass,
          targetLengthWords: create.targetLengthWords,
          scheduledWeek: create.scheduledWeek,
          priority: create.priority,
          autoPublish: create.autoPublish,
        },
      });
      updated.push(spec.slug);
    } else {
      await prisma.blogTopic.create({ data: create });
      seeded.push(spec.slug);
    }
  }

  return NextResponse.json({
    status: 'ok',
    total_in_catalog: TOPIC_CATALOG.length,
    created: seeded.length,
    updated: updated.length,
    seeded,
    updated_slugs: updated,
  });
}

export const POST = GET;
