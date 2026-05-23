import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const { id } = await params;
  const entry = await prisma.changelog.findUnique({ where: { id } });
  if (!entry) return NextResponse.json({ code: 'not_found', error: 'Not found' }, { status: 404 });
  return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const { id } = await params;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ['version', 'title', 'title_en', 'body', 'body_en', 'category', 'isPublished']) {
    if (key in body) data[key] = body[key];
  }
  if ('releasedAt' in body && body.releasedAt) data.releasedAt = new Date(body.releasedAt);
  const entry = await prisma.changelog.update({ where: { id }, data });
  revalidatePath('/changelog');
  return NextResponse.json(entry);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const { id } = await params;
  await prisma.changelog.delete({ where: { id } });
  revalidatePath('/changelog');
  return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
