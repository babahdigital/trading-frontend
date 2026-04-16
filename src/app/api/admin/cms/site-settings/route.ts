import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  type: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const settings = await prisma.siteSetting.findMany({ orderBy: { key: 'asc' } });
  return NextResponse.json(settings);
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = settingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const setting = await prisma.siteSetting.upsert({
    where: { key: parsed.data.key },
    update: { value: parsed.data.value, type: parsed.data.type },
    create: parsed.data,
  });
  revalidatePath('/');
  return NextResponse.json(setting);
}
