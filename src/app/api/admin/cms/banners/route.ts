export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const bannerSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
  linkUrl: z.string().optional(),
  linkLabel: z.string().optional(),
  position: z.enum(['TOP', 'BOTTOM', 'FLOATING']).optional(),
  bgColor: z.string().optional(),
  textColor: z.string().optional(),
  isActive: z.boolean().optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const banners = await prisma.banner.findMany({ orderBy: { createdAt: 'desc' } });
  return NextResponse.json(banners);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = bannerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data = {
    ...parsed.data,
    startsAt: parsed.data.startsAt ? new Date(parsed.data.startsAt) : undefined,
    endsAt: parsed.data.endsAt ? new Date(parsed.data.endsAt) : undefined,
  };
  const banner = await prisma.banner.create({ data });
  revalidatePath('/');
  return NextResponse.json(banner, { status: 201 });
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
  const banner = await prisma.banner.update({ where: { id }, data });
  revalidatePath('/');
  return NextResponse.json(banner);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.banner.delete({ where: { id } });
  revalidatePath('/');
  return NextResponse.json({ success: true });
}
