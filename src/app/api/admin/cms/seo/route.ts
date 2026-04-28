export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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
  // Bilingual EN columns (optional — populated by AI auto-translate worker
  // or admin manual edit via hybrid editor pattern)
  title_en: z.string().nullable().optional(),
  description_en: z.string().nullable().optional(),
  ogTitle_en: z.string().nullable().optional(),
  ogDescription_en: z.string().nullable().optional(),
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

  // Detect ID source change → invalidate en_synced_at so worker retranslates
  // next tick. Admin manual EN edit → set en_synced_at = now (worker respects).
  const existing = await prisma.pageMeta.findUnique({ where: { id } });
  let syncOverride: { en_synced_at?: Date | null } = {};
  if (existing) {
    const idChanged = ['title', 'description', 'ogTitle', 'ogDescription'].some((k) => {
      const v = (data as Record<string, unknown>)[k];
      return v !== undefined && v !== (existing as Record<string, unknown>)[k];
    });
    const enManuallyEdited = ['title_en', 'description_en', 'ogTitle_en', 'ogDescription_en'].some((k) => {
      const v = (data as Record<string, unknown>)[k];
      return v !== undefined && v !== (existing as Record<string, unknown>)[k];
    });
    if (idChanged && !enManuallyEdited) {
      syncOverride = { en_synced_at: null };
    } else if (enManuallyEdited) {
      syncOverride = { en_synced_at: new Date() };
    }
  }

  const page = await prisma.pageMeta.update({ where: { id }, data: { ...data, ...syncOverride } });
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
