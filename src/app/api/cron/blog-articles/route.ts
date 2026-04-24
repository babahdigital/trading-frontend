import { NextRequest, NextResponse } from 'next/server';
import { runBlogArticleGenerator } from '@/lib/workers/blog-article-generator';

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

  const topicSlug = req.nextUrl.searchParams.get('slug') ?? undefined;
  const force = req.nextUrl.searchParams.get('force') === '1';
  const maxRaw = req.nextUrl.searchParams.get('max');
  const maxTopicsPerRun = maxRaw ? Math.max(1, Math.min(10, parseInt(maxRaw, 10))) : undefined;

  const result = await runBlogArticleGenerator({ topicSlug, force, maxTopicsPerRun });
  return NextResponse.json(result);
}

export const POST = GET;
