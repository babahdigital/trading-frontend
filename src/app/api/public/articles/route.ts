import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
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
    if (!article) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(article);
  }

  const articles = await prisma.article.findMany({
    where: { isPublished: true },
    orderBy: { publishedAt: 'desc' },
    select: {
      id: true, slug: true, title: true, title_en: true,
      excerpt: true, excerpt_en: true, category: true,
      author: true, readTime: true, imageUrl: true, publishedAt: true,
    },
  });
  return NextResponse.json(articles);
}
