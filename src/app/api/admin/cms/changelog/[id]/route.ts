import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const entry = await prisma.changelog.findUnique({ where: { id: params.id } });
  if (!entry) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;
  const body = await req.json();
  const data: Record<string, unknown> = {};
  for (const key of ['version', 'title', 'title_en', 'body', 'body_en', 'category', 'isPublished']) {
    if (key in body) data[key] = body[key];
  }
  if ('releasedAt' in body && body.releasedAt) data.releasedAt = new Date(body.releasedAt);
  const entry = await prisma.changelog.update({ where: { id: params.id }, data });
  revalidatePath('/changelog');
  return NextResponse.json(entry);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = requireAdmin(req);
  if (guard) return guard;
  await prisma.changelog.delete({ where: { id: params.id } });
  revalidatePath('/changelog');
  return NextResponse.json({ ok: true });
}
