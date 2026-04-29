export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { requireAdmin } from '@/lib/auth/require-admin';

const ReviewBody = z.object({
  decision: z.enum(['APPROVED', 'REJECTED', 'ADDITIONAL_INFO_REQUIRED']),
  rejectionReason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
}).strict();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  const { id } = await params;
  const kyc = await prisma.userKyc.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true, createdAt: true } } },
  });
  if (!kyc) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ kyc });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = requireAdmin(request);
  if (guard) return guard;
  const reviewerId = request.headers.get('x-user-id');
  if (!reviewerId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  let body: z.infer<typeof ReviewBody>;
  try {
    body = ReviewBody.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const existing = await prisma.userKyc.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status === 'APPROVED' && body.decision !== 'APPROVED') {
    return NextResponse.json({ error: 'cannot_revert_approval' }, { status: 409 });
  }

  const updated = await prisma.userKyc.update({
    where: { id },
    data: {
      status: body.decision,
      reviewedAt: new Date(),
      reviewedBy: reviewerId,
      rejectionReason: body.decision === 'APPROVED' ? null : (body.rejectionReason ?? existing.rejectionReason),
      notes: body.notes ?? existing.notes,
    },
  });

  return NextResponse.json({ ok: true, kyc: updated });
}
