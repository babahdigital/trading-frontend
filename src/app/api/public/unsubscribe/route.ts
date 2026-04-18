import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  if (!email || typeof email !== 'string') {
    return NextResponse.json({ error: 'email required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return success to not leak user existence
    return NextResponse.json({ ok: true });
  }

  // Remove EMAIL channel from notification preferences
  const pref = await prisma.notificationPreference.findUnique({
    where: { userId: user.id },
  });

  if (pref) {
    const channels = (pref.channels as string[]).filter((c) => c !== 'EMAIL');
    await prisma.notificationPreference.update({
      where: { userId: user.id },
      data: { channels },
    });
  }

  return NextResponse.json({ ok: true });
}
