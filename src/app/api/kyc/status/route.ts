export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const kyc = await prisma.userKyc.findUnique({
    where: { userId },
    select: {
      id: true,
      status: true,
      fullName: true,
      submittedAt: true,
      reviewedAt: true,
      rejectionReason: true,
      documentType: true,
      investmentExperience: true,
      riskTolerance: true,
      expectedMonthlyVolume: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({
    kyc: kyc ?? { status: 'NOT_SUBMITTED' as const },
  });
}
