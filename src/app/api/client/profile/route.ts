import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db/prisma';
import { getUserIdFromRequest } from '@/lib/auth/session';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { generateIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';

const profileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  telegramChatId: z.string().max(100).optional().nullable(),
  whatsappNumber: z.string().max(20).optional().nullable(),
  locale: z.enum(['id', 'en']).optional(),
}).strict();

const log = createLogger('api/client/profile');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, role: true, mt5Account: true,
        twoFaEnabled: true, telegramChatId: true, whatsappNumber: true,
        createdAt: true, lastLoginAt: true,
      },
    });
    if (!user) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ code: 'internal_error', error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const parsed = profileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ code: 'validation_error', error: parsed.error.flatten() }, { status: 400 });
    }
    const data: Record<string, unknown> = {};
    if ('name' in parsed.data) data.name = parsed.data.name || null;
    if ('telegramChatId' in parsed.data) data.telegramChatId = parsed.data.telegramChatId || null;
    if ('whatsappNumber' in parsed.data) data.whatsappNumber = parsed.data.whatsappNumber || null;
    if ('locale' in parsed.data) data.locale = parsed.data.locale;
    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, telegramChatId: true, whatsappNumber: true },
    });

    // Bridge Telegram chat id to backend (Wave-29B). Fire-and-forget — local
    // mirror is the source of truth for in-app references; backend owns
    // dispatch routing. WhatsApp has its own dedicated bridge via
    // /api/client/whatsapp/config so we don't double-write here.
    if ('telegramChatId' in parsed.data) {
      proxyToMasterBackend('signals', '/api/forex/tenant/telegram', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': generateIdempotencyKey('tg-mirror'),
          'X-Babahalgo-User-Id': userId,
        },
        body: JSON.stringify({ chat_id: parsed.data.telegramChatId || null }),
      }).catch((err) => log.warn(`Telegram bridge failed: ${err instanceof Error ? err.message : 'unknown'}`));
    }

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ code: 'internal_error', error: 'Internal server error' }, { status: 500 });
  }
}
