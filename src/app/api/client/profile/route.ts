import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { jwtVerify } from 'jose';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function getUserId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization');
  const token = auth?.replace(/^Bearer\s+/i, '') || req.cookies.get('auth-token')?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return (payload.userId as string) || (payload.sub as string) || null;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
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
  const userId = await getUserId(req);
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
  return NextResponse.json(user);
}
