import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(request: NextRequest) {
  try {
    const { refreshToken } = await request.json();
    if (refreshToken) {
      await prisma.session.updateMany({
        where: { refreshToken, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    const userId = request.headers.get('x-user-id');
    if (userId) {
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'logout',
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          metadata: {},
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
