/**
 * Admin Promotion CRUD — list + create + update + delete.
 *
 * GET    /api/admin/cms/promotions?status=DRAFT|SCHEDULED|ACTIVE|...
 * POST   /api/admin/cms/promotions       — create new promo (manual atau strategist)
 * PATCH  /api/admin/cms/promotions       — update promo (id in body)
 * DELETE /api/admin/cms/promotions?id=X   — delete promo
 *
 * AI image gen: /api/admin/cms/promotions/[id]/generate-image
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';

const PromotionSchema = z.object({
  slug: z.string().min(3).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3).max(128),
  name_en: z.string().nullable().optional(),
  description: z.string().min(10).max(1000),
  description_en: z.string().nullable().optional(),
  discountType: z.enum(['PERCENT', 'FIXED_IDR']).default('PERCENT'),
  discountValue: z.number().min(0).max(100_000_000),
  applicableTiers: z.array(z.string()).default([]),
  maxUsage: z.number().int().min(0).default(0),
  popupTitle: z.string().nullable().optional(),
  popupTitle_en: z.string().nullable().optional(),
  popupBody: z.string().nullable().optional(),
  popupBody_en: z.string().nullable().optional(),
  heroImageUrl: z.string().nullable().optional(),
  ctaLabel: z.string().nullable().optional(),
  ctaLabel_en: z.string().nullable().optional(),
  ctaLink: z.string().nullable().optional(),
  popupTrigger: z.enum(['DELAY', 'EXIT_INTENT', 'SCROLL', 'PAGE_LOAD']).default('DELAY'),
  popupDelayMs: z.number().int().min(0).default(3000),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'ACTIVE', 'PAUSED']).default('DRAFT'),
  aiGenerated: z.boolean().default(false),
  aiContext: z.record(z.string(), z.unknown()).nullable().optional(),
  aiImagePrompt: z.string().nullable().optional(),
  confidence: z.number().int().min(0).max(100).default(0),
  calendarEventId: z.string().nullable().optional(),
});

export async function GET(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const statusFilter = request.nextUrl.searchParams.get('status');
  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50', 10) || 50, 200);

  const where: Record<string, unknown> = {};
  if (statusFilter && ['DRAFT', 'SCHEDULED', 'ACTIVE', 'EXPIRED', 'PAUSED', 'REJECTED'].includes(statusFilter)) {
    where.status = statusFilter;
  }

  const items = await prisma.promotion.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { calendarEvent: { select: { slug: true, name: true, eventDate: true } } },
  });

  return NextResponse.json({ items, count: items.length });
}

export async function POST(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const reviewerId = request.headers.get('x-user-id');
  if (!reviewerId) return NextResponse.json({ code: 'forbidden', error: 'Forbidden' }, { status: 403 });

  let body: z.infer<typeof PromotionSchema>;
  try {
    body = PromotionSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const startsAt = new Date(body.startsAt);
  const endsAt = new Date(body.endsAt);
  if (endsAt.getTime() <= startsAt.getTime()) {
    return NextResponse.json({ code: 'invalid_schedule', error: 'endsAt must be after startsAt' }, { status: 400 });
  }

  const { aiContext, ...rest } = body;
  try {
    const promo = await prisma.promotion.create({
      data: {
        ...rest,
        startsAt,
        endsAt,
        discountValue: new Prisma.Decimal(body.discountValue),
        applicableTiers: body.applicableTiers as Prisma.InputJsonValue,
        aiContext: (aiContext ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        createdById: reviewerId,
      },
    });

    revalidatePath('/');
    revalidatePath('/pricing');
    revalidatePath('/checkout');

    return NextResponse.json({ ok: true, promotion: promo }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ code: 'conflict', error: 'duplicate_slug' }, { status: 409 });
    }
    throw err;
  }
}

const UpdateSchema = PromotionSchema.partial().extend({
  id: z.string().min(1),
});

export async function PATCH(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  let body: z.infer<typeof UpdateSchema>;
  try {
    body = UpdateSchema.parse(await request.json());
  } catch (err) {
    return NextResponse.json(
      { error: 'invalid_body', details: err instanceof Error ? err.message : 'parse error' },
      { status: 400 },
    );
  }

  const { id, aiContext, startsAt, endsAt, applicableTiers, discountValue, ...rest } = body;

  try {
    const data: Record<string, unknown> = { ...rest };

    if (startsAt !== undefined) data.startsAt = new Date(startsAt);
    if (endsAt !== undefined) data.endsAt = new Date(endsAt);
    if (discountValue !== undefined) data.discountValue = new Prisma.Decimal(discountValue);
    if (applicableTiers !== undefined) data.applicableTiers = applicableTiers as Prisma.InputJsonValue;
    if (aiContext !== undefined) data.aiContext = (aiContext ?? Prisma.JsonNull) as Prisma.InputJsonValue;

    const promo = await prisma.promotion.update({
      where: { id },
      data,
    });

    revalidatePath('/');
    revalidatePath('/pricing');
    revalidatePath('/checkout');

    return NextResponse.json({ ok: true, promotion: promo });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json({ code: 'conflict', error: 'duplicate_slug' }, { status: 409 });
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest) {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const id = request.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ code: 'bad_request', error: 'id is required' }, { status: 400 });

  try {
    await prisma.promotion.delete({ where: { id } });

    revalidatePath('/');
    revalidatePath('/pricing');
    revalidatePath('/checkout');

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });
    }
    throw err;
  }
}
