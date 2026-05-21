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
      documentFrontUrl: true,
      documentBackUrl: true,
      selfieUrl: true,
    },
  });

  if (!kyc) {
    return NextResponse.json({ kyc: { status: 'NOT_SUBMITTED' as const } });
  }

  // Expose only flags (existence + filename for cache-busting), not full
  // server paths. Wizard renders preview via /api/kyc/document?kind=X which
  // resolves filename server-side.
  const { documentFrontUrl, documentBackUrl, selfieUrl, ...safe } = kyc;
  return NextResponse.json({
    kyc: {
      ...safe,
      hasFront: Boolean(documentFrontUrl),
      hasBack: Boolean(documentBackUrl),
      hasSelfie: Boolean(selfieUrl),
      // Cache-bust key changes when filename rotates (re-upload)
      docVersion: [documentFrontUrl ?? '', documentBackUrl ?? '', selfieUrl ?? ''].join('|'),
    },
  });
}
