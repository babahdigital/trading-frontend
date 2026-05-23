export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const pageSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  title_en: z.string().optional(),
  subtitle: z.string().optional(),
  subtitle_en: z.string().optional(),
  body: z.string().min(1),
  body_en: z.string().optional(),
  sections: z.array(z.record(z.unknown())).optional(),
  sections_en: z.array(z.record(z.unknown())).optional(),
  isVisible: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const pages = await prisma.pageContent.findMany({ orderBy: { slug: 'asc' } });
  return NextResponse.json(pages);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = pageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'validation_error', error: parsed.error.flatten() }, { status: 400 });

  const page = await prisma.pageContent.create({ data: parsed.data as Parameters<typeof prisma.pageContent.create>[0]['data'] });
  revalidatePath('/');
  return NextResponse.json(page, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ code: 'bad_request', error: 'id is required' }, { status: 400 });

  const page = await prisma.pageContent.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json(page);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ code: 'bad_request', error: 'id is required' }, { status: 400 });

  await prisma.pageContent.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
