import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  try {
  const slug = request.nextUrl.searchParams.get('slug');

  if (slug) {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, title: true, title_en: true,
        excerpt: true, excerpt_en: true, body: true, body_en: true,
        category: true, author: true, readTime: true, imageUrl: true,
        publishedAt: true,
      },
    });
    if (!article) return NextResponse.json({ code: 'not_found', error: 'Not found' }, { status: 404 });
    return NextResponse.json(article);
  }

  const fields = request.nextUrl.searchParams.get('fields');
  if (fields === 'imageUrl') {
    const slugParam = request.nextUrl.searchParams.get('slug');
    if (!slugParam) return NextResponse.json({ code: 'slug_required' }, { status: 400 });
    const row = await prisma.article.findUnique({
      where: { slug: slugParam },
      select: { imageUrl: true },
    });
    return NextResponse.json({ imageUrl: row?.imageUrl ?? null }, {
      headers: { 'Cache-Control': 'public, max-age=3600, s-maxage=86400' },
    });
  }

  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true, slug: true, title: true, title_en: true,
      excerpt: true, excerpt_en: true, category: true,
      author: true, readTime: true, publishedAt: true,
      thumbnailUrl: true,
    },
  });
  return NextResponse.json(articles, {
    headers: { 'Cache-Control': 'public, max-age=300, s-maxage=600' },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
