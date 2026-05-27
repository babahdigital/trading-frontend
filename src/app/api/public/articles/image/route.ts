import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug');
  if (!slug) {
    return NextResponse.json({ code: 'slug_required' }, { status: 400 });
  }

  try {
    const article = await prisma.article.findUnique({
      where: { slug },
      select: { imageUrl: true },
    });

    if (!article?.imageUrl) {
      return new NextResponse(null, { status: 404 });
    }

    const match = article.imageUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!match) {
      return new NextResponse(null, { status: 404 });
    }

    const [, contentType, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
        'Content-Length': String(buffer.length),
      },
    });
  } catch {
    return new NextResponse(null, { status: 500 });
  }
}
