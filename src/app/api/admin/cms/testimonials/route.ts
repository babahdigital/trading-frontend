export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const testimonialSchema = z.object({
  name: z.string().min(1),
  role: z.string().optional(),
  content: z.string().min(1),
  rating: z.number().int().min(1).max(5).optional(),
  avatarUrl: z.string().optional(),
  isVisible: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  try {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const testimonials = await prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(testimonials);
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
  const parsed = testimonialSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ code: 'validation_error', error: parsed.error.flatten() }, { status: 400 });

  const t = await prisma.testimonial.create({ data: parsed.data });
  revalidatePath('/');
  return NextResponse.json(t, { status: 201 });
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

  const t = await prisma.testimonial.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json(t);
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

  await prisma.testimonial.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
