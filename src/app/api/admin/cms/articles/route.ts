import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const articleSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  title_en: z.string().optional(),
  excerpt: z.string().min(1),
  excerpt_en: z.string().optional(),
  body: z.string().min(1),
  body_en: z.string().optional(),
  category: z.enum(['RESEARCH', 'STRATEGY', 'EXECUTION', 'RISK', 'OPERATIONS', 'MARKET_ANALYSIS']).optional(),
  author: z.string().optional(),
  readTime: z.number().int().optional(),
  imageUrl: z.string().optional(),
  isPublished: z.boolean().optional(),
  publishedAt: z.string().datetime().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const articles = await prisma.article.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(articles);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = articleSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { publishedAt, ...rest } = parsed.data;
  const article = await prisma.article.create({
    data: {
      ...rest,
      ...(publishedAt && { publishedAt: new Date(publishedAt) }),
    },
  });
  revalidatePath('/research');
  return NextResponse.json(article, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  if (data.publishedAt) data.publishedAt = new Date(data.publishedAt);
  const article = await prisma.article.update({ where: { id }, data });
  revalidatePath('/research');
  return NextResponse.json(article);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.article.delete({ where: { id } });
  revalidatePath('/research');
  return NextResponse.json({ success: true });
}
