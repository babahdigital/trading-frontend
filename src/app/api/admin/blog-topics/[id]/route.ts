export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';

const updateSchema = z.object({
  titleId: z.string().min(5).optional(),
  titleEn: z.string().min(5).optional(),
  excerptId: z.string().min(20).optional(),
  excerptEn: z.string().min(20).optional(),
  promptTemplate: z.string().min(50).optional(),
  dataSources: z.array(z.record(z.string(), z.unknown())).optional(),
  keywords: z.array(z.string()).optional(),
  category: z.string().optional(),
  assetClass: z.string().optional(),
  targetLengthWords: z.number().int().min(300).max(5000).optional(),
  scheduledWeek: z.number().int().min(1).max(52).optional(),
  priority: z.number().int().min(0).max(1000).optional(),
  autoPublish: z.boolean().optional(),
  isActive: z.boolean().optional(),
  status: z.enum(['PENDING', 'GENERATING', 'GENERATED', 'PUBLISHED', 'FAILED', 'DISABLED']).optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const topic = await prisma.blogTopic.findUnique({
    where: { id },
    include: {
      article: {
        select: { id: true, slug: true, body: true, body_en: true, isPublished: true, publishedAt: true },
      },
    },
  });
  if (!topic) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(topic);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.blogTopic.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const data = { ...parsed.data } as Record<string, unknown>;
  if (parsed.data.dataSources !== undefined) {
    data.dataSources = parsed.data.dataSources;
  }

  const topic = await prisma.blogTopic.update({
    where: { id },
    data: data as never,
  });
  revalidatePath('/research');
  return NextResponse.json(topic);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const { id } = await params;
  const existing = await prisma.blogTopic.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });

  await prisma.blogTopic.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
