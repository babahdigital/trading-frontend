import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const entries = await prisma.changelog.findMany({
    orderBy: { releasedAt: 'desc' },
  });
  return NextResponse.json(entries);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const body = await req.json();
  const entry = await prisma.changelog.create({
    data: {
      version: String(body.version),
      title: String(body.title),
      title_en: body.title_en ?? null,
      body: String(body.body),
      body_en: body.body_en ?? null,
      category: body.category ?? 'FEATURE',
      releasedAt: body.releasedAt ? new Date(body.releasedAt) : new Date(),
      isPublished: Boolean(body.isPublished),
    },
  });
  revalidatePath('/changelog');
  return NextResponse.json(entry, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
