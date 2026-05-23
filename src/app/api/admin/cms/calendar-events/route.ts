export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/require-admin';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/admin/cms/calendar-events');

const calendarEventSchema = z.object({
  slug: z.string().min(1),
  templateKey: z.string().min(1),
  name: z.string().min(1),
  name_en: z.string().nullable().optional(),
  eventDate: z.string().min(1), // ISO date string
  leadDays: z.number().int().min(0).optional(),
  country: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const events = await prisma.calendarEvent.findMany({
      orderBy: { eventDate: 'asc' },
    });
    return NextResponse.json(events);
  } catch (error) {
    log.error('List calendar events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const parsed = calendarEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { eventDate, ...rest } = parsed.data;
    const event = await prisma.calendarEvent.create({
      data: {
        ...rest,
        eventDate: new Date(eventDate),
      },
    });
    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    log.error('Create calendar event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const parsed = calendarEventSchema.partial().safeParse(data);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const updateData = { ...parsed.data } as Record<string, unknown>;
    if (parsed.data.eventDate) {
      updateData.eventDate = new Date(parsed.data.eventDate);
    }

    const event = await prisma.calendarEvent.update({
      where: { id },
      data: updateData,
    });
    return NextResponse.json(event);
  } catch (error) {
    log.error('Update calendar event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  try {
    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await prisma.calendarEvent.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    log.error('Delete calendar event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
