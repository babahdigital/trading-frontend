export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const faqSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
  question_en: z.string().nullable().optional(),
  answer_en: z.string().nullable().optional(),
  category: z.enum(['GENERAL', 'PRICING', 'TECHNICAL', 'SECURITY']).optional(),
  sortOrder: z.number().int().optional(),
  isVisible: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const faqs = await prisma.faq.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] });
  return NextResponse.json(faqs);
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const parsed = faqSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const faq = await prisma.faq.create({ data: parsed.data });
  revalidatePath('/');
  revalidatePath('/faq');
  return NextResponse.json(faq, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json();
  const { id, ...data } = body;
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // Detect Indonesian source change → invalidate EN sync timestamp so the
  // zero-touch worker retranslates on the next tick. If admin manually
  // edits *_en columns directly (still allowed), we treat that as their
  // override and bump en_synced_at to now() so the worker doesn't clobber.
  let next: Record<string, unknown> = { ...data };
  const existing = await prisma.faq.findUnique({ where: { id } });
  if (existing) {
    const idChanged = (data.question !== undefined && data.question !== existing.question)
      || (data.answer !== undefined && data.answer !== existing.answer);
    const enManuallyEdited = (data.question_en !== undefined && data.question_en !== existing.question_en)
      || (data.answer_en !== undefined && data.answer_en !== existing.answer_en);
    if (idChanged && !enManuallyEdited) {
      // Indonesian changed but EN wasn't touched → mark stale, worker will pick up.
      next = { ...next, en_synced_at: null };
    } else if (enManuallyEdited) {
      // Admin saved manual EN edit → freshly synced (bypass worker until next ID change).
      next = { ...next, en_synced_at: new Date() };
    }
  }

  const faq = await prisma.faq.update({ where: { id }, data: next });
  revalidatePath('/');
  revalidatePath('/faq');
  return NextResponse.json(faq);
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  await prisma.faq.delete({ where: { id } });
  revalidatePath('/');
  revalidatePath('/faq');
  return NextResponse.json({ success: true });
}
