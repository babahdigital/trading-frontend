/**
 * Admin email template list + create.
 * GET: return all templates (active dan inactive).
 * POST: create template baru (slug unique).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const templates = await prisma.emailTemplate.findMany({
    orderBy: { slug: 'asc' },
  });
  return NextResponse.json({ templates });
}

const createSchema = z.object({
  slug: z.string().regex(/^[a-z0-9_]+$/, 'slug_invalid').min(3).max(60),
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
  variables: z.array(z.string()).default([]),
  subjectId: z.string().min(1).max(200),
  subjectEn: z.string().min(1).max(200),
  bodyId: z.string().min(1),
  bodyEn: z.string().min(1),
  textId: z.string().optional(),
  textEn: z.string().optional(),
  isActive: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const tpl = await prisma.emailTemplate.create({
      data: {
        slug: parsed.data.slug,
        name: parsed.data.name,
        description: parsed.data.description,
        variables: parsed.data.variables,
        subject_id: parsed.data.subjectId,
        subject_en: parsed.data.subjectEn,
        body_id: parsed.data.bodyId,
        body_en: parsed.data.bodyEn,
        text_id: parsed.data.textId,
        text_en: parsed.data.textEn,
        isActive: parsed.data.isActive,
      },
    });
    return NextResponse.json({ success: true, template: tpl }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    if (msg.includes('Unique constraint')) {
      return NextResponse.json({ error: 'slug_exists' }, { status: 409 });
    }
    return NextResponse.json({ error: 'create_failed', message: msg }, { status: 500 });
  }
}
