export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const sectionSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  content: z.record(z.unknown()).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const sections = await prisma.landingSection.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(sections);
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
  const parsed = sectionSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'validation_error', error: parsed.error.flatten() }, { status: 400 });

  const { content, ...rest } = parsed.data;
  const section = await prisma.landingSection.create({
    data: {
      ...rest,
      ...(content && { content: content as Record<string, string> }),
    },
  });
  revalidatePath('/');
  return NextResponse.json(section, { status: 201 });
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

  const section = await prisma.landingSection.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json(section);
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

  await prisma.landingSection.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
