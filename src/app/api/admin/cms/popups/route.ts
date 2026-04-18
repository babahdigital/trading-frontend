export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const popupSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  imageUrl: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaLink: z.string().optional(),
  trigger: z.enum(['DELAY', 'EXIT_INTENT', 'SCROLL', 'PAGE_LOAD']).optional(),
  triggerValue: z.string().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const popups = await prisma.popup.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(popups);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = popupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = {
    ...parsed.data,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
  };
  const popup = await prisma.popup.create({ data });
  revalidatePath('/');
  return NextResponse.json(popup, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const data = {
    ...rest,
    startsAt: rest.startsAt ? new Date(rest.startsAt) : undefined,
    endsAt: rest.endsAt ? new Date(rest.endsAt) : undefined,
  };
  const popup = await prisma.popup.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json(popup);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.popup.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
}
