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

const DEFAULT_PREF = {
  channels: ['INAPP'] as string[],
  minConfidence: '0.70',
  language: 'id',
  timezone: 'Asia/Jakarta',
  quietHoursStart: null as string | null,
  quietHoursEnd: null as string | null,
};

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const [pref, logs] = await Promise.all([
    prisma.notificationPreference.findUnique({ where: { userId } }),
    prisma.notificationLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 30,
      select: { id: true, channel: true, category: true, status: true, createdAt: true, deliveredAt: true, errorMessage: true },
    }),
  ]);

  return NextResponse.json({
    preference: pref ?? { userId, ...DEFAULT_PREF },
    recent: logs,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const data: Record<string, unknown> = {};
  if ('channels' in body && Array.isArray(body.channels)) data.channels = body.channels;
  if ('minConfidence' in body) data.minConfidence = body.minConfidence != null ? String(body.minConfidence) : null;
  if ('language' in body) data.language = body.language;
  if ('timezone' in body) data.timezone = body.timezone;
  if ('quietHoursStart' in body) data.quietHoursStart = body.quietHoursStart || null;
  if ('quietHoursEnd' in body) data.quietHoursEnd = body.quietHoursEnd || null;

  const pref = await prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId, ...data } as never,
    update: data,
  });
  return NextResponse.json(pref);
}
