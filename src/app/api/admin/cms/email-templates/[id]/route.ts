/**
 * Admin email template detail / update / delete / preview / send-test.
 *
 * GET    /api/admin/cms/email-templates/{id}        — detail
 * PUT    /api/admin/cms/email-templates/{id}        — update
 * DELETE /api/admin/cms/email-templates/{id}        — soft delete (set isActive=false)
 * POST   /api/admin/cms/email-templates/{id}/preview — render preview dengan sample vars
 * POST   /api/admin/cms/email-templates/{id}/send-test — kirim test ke email tertentu
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';
import { z } from 'zod';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  const tpl = await prisma.emailTemplate.findUnique({ where: { id } });
  if (!tpl) return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });
  return NextResponse.json({ template: tpl });
}

const updateSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(500).optional(),
  variables: z.array(z.string()).optional(),
  subjectId: z.string().min(1).max(200).optional(),
  subjectEn: z.string().min(1).max(200).optional(),
  bodyId: z.string().min(1).optional(),
  bodyEn: z.string().min(1).optional(),
  textId: z.string().optional(),
  textEn: z.string().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'validation_failed', details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) data.name = parsed.data.name;
  if (parsed.data.description !== undefined) data.description = parsed.data.description;
  if (parsed.data.variables !== undefined) data.variables = parsed.data.variables;
  if (parsed.data.subjectId !== undefined) data.subject_id = parsed.data.subjectId;
  if (parsed.data.subjectEn !== undefined) data.subject_en = parsed.data.subjectEn;
  if (parsed.data.bodyId !== undefined) data.body_id = parsed.data.bodyId;
  if (parsed.data.bodyEn !== undefined) data.body_en = parsed.data.bodyEn;
  if (parsed.data.textId !== undefined) data.text_id = parsed.data.textId;
  if (parsed.data.textEn !== undefined) data.text_en = parsed.data.textEn;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  try {
    const tpl = await prisma.emailTemplate.update({ where: { id }, data });
    return NextResponse.json({ success: true, template: tpl });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ code: 'update_failed', error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAdmin(request);
  if (denied) return denied;
  const { id } = await params;
  // Soft delete — set isActive=false instead of hard delete (preserve history)
  await prisma.emailTemplate.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}
