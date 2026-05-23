export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { runBlogArticleGenerator } from '@/lib/workers/blog-article-generator';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const topic = await prisma.blogTopic.findUnique({ where: { id } });
  if (!topic) return NextResponse.json({ code: 'not_found', error: 'not found' }, { status: 404 });

  // Reset status so worker picks it up, then run synchronously for this slug
  await prisma.blogTopic.update({
    where: { id },
    data: { status: 'PENDING', lastError: null },
  });

  const result = await runBlogArticleGenerator({ topicSlug: topic.slug, force: true });
  revalidatePath('/research');
  return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
