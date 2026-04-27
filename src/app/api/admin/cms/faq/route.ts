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

  const faq = await prisma.faq.update({ where: { id }, data });
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
