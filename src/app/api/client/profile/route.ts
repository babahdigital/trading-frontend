import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getUserIdFromRequest } from '@/lib/auth/session';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { generateIdempotencyKey } from '@/lib/api/idempotency';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/profile');

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
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
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserIdFromRequest(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ('name' in body) data.name = body.name || null;
  if ('telegramChatId' in body) data.telegramChatId = body.telegramChatId || null;
  if ('whatsappNumber' in body) data.whatsappNumber = body.whatsappNumber || null;
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, telegramChatId: true, whatsappNumber: true },
  });

  // Bridge Telegram chat id to backend (Wave-29B). Fire-and-forget — local
  // mirror is the source of truth for in-app references; backend owns
  // dispatch routing. WhatsApp has its own dedicated bridge via
  // /api/client/whatsapp/config so we don't double-write here.
  if ('telegramChatId' in body) {
    proxyToMasterBackend('signals', '/api/forex/tenant/telegram', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': generateIdempotencyKey('tg-mirror'),
        'X-Babahalgo-User-Id': userId,
      },
      body: JSON.stringify({ chat_id: body.telegramChatId || null }),
    }).catch((err) => log.warn(`Telegram bridge failed: ${err instanceof Error ? err.message : 'unknown'}`));
  }

  return NextResponse.json(user);
}
