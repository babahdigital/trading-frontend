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
  const denied = requireAdmin(request);
  if (denied) return denied;

  const testimonials = await prisma.testimonial.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(testimonials);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = testimonialSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const t = await prisma.testimonial.create({ data: parsed.data });
  revalidatePath('/');
  return NextResponse.json(t, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const t = await prisma.testimonial.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json(t);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.testimonial.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
}
