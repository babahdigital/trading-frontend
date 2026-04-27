export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const pricingSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  price: z.string().min(1),
  subtitle: z.string().optional(),
  features: z.array(z.string()).optional(),
  excluded: z.array(z.string()).optional(),
  note: z.string().optional(),
  ctaLabel: z.string().optional(),
  ctaLink: z.string().optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
  // Bilingual EN columns (optional, populated by AI auto-translate or manual edit)
  name_en: z.string().nullable().optional(),
  subtitle_en: z.string().nullable().optional(),
  features_en: z.array(z.string()).nullable().optional(),
  ctaLabel_en: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const tiers = await prisma.pricingTier.findMany({ orderBy: { sortOrder: 'asc' } });
  return NextResponse.json(tiers);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = pricingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { features_en, ...rest } = parsed.data;
  const tier = await prisma.pricingTier.create({
    data: {
      ...rest,
      ...(features_en !== undefined ? { features_en: features_en === null ? Prisma.JsonNull : features_en } : {}),
    },
  });
  revalidatePath('/');
  revalidatePath('/pricing');
  revalidatePath('/register');
  return NextResponse.json(tier, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, features_en, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const updateData: Prisma.PricingTierUpdateInput = {
    ...data,
    ...(features_en !== undefined
      ? { features_en: features_en === null ? Prisma.JsonNull : features_en }
      : {}),
  };

  const tier = await prisma.pricingTier.update({ where: { id }, data: updateData });
  revalidatePath('/');
  revalidatePath('/pricing');
  revalidatePath('/register');
  return NextResponse.json(tier);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.pricingTier.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/pricing');
  revalidatePath('/register');
  return NextResponse.json({ success: true });
}
