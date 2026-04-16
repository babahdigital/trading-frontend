import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const pageMetaSchema = z.object({
  path: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  ogImage: z.string().optional(),
  structuredData: z.record(z.unknown()).optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const pages = await prisma.pageMeta.findMany({ orderBy: { path: 'asc' } });
  return NextResponse.json(pages);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = pageMetaSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { structuredData, ...rest } = parsed.data;
  const page = await prisma.pageMeta.create({
    data: {
      ...rest,
      ...(structuredData && { structuredData: structuredData as Record<string, string> }),
    },
  });
  revalidatePath(parsed.data.path);
  return NextResponse.json(page, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const page = await prisma.pageMeta.update({ where: { id }, data });
  if (data.path) revalidatePath(data.path);
  revalidatePath('/');
  return NextResponse.json(page);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.pageMeta.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
}
