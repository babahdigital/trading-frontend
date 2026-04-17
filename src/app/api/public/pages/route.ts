import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');

  if (slug) {
    const page = await prisma.pageContent.findUnique({
      where: { slug },
    });
    if (!page || !page.isVisible) {
      return NextResponse.json(null);
    }
    return NextResponse.json(page);
  }

  const pages = await prisma.pageContent.findMany({
    where: { isVisible: true },
    orderBy: { slug: 'asc' },
    select: {
      id: true, slug: true, title: true, title_en: true,
      subtitle: true, subtitle_en: true,
    },
  });
  return NextResponse.json(pages);
}
