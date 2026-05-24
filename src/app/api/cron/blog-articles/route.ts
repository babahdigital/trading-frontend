import { NextRequest, NextResponse } from 'next/server';
import { runBlogArticleGenerator } from '@/lib/workers/blog-article-generator';
import { verifyCronSecret } from '@/lib/auth/cron';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ code: 'unauthorized', error: 'unauthorized' }, { status: 401 });
  }

  const topicSlug = req.nextUrl.searchParams.get('slug') ?? undefined;
  const force = req.nextUrl.searchParams.get('force') === '1';
  const maxRaw = req.nextUrl.searchParams.get('max');
  const maxTopicsPerRun = maxRaw ? Math.max(1, Math.min(10, parseInt(maxRaw, 10))) : undefined;

  const result = await runBlogArticleGenerator({ topicSlug, force, maxTopicsPerRun });
  return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export const POST = GET;
