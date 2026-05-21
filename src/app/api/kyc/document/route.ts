export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { readKycDoc, type KycDocKind } from '@/lib/kyc/storage';

/**
 * GET /api/kyc/document?kind=front|back|selfie
 *
 * Stream KYC document untuk owner sendiri. Reconstruct path dari DB
 * (filename) + userId (header) — defense-in-depth path-traversal.
 *
 * Cache headers: `private, max-age=300` — boleh cache di browser tapi tidak
 * di CDN karena content sensitive.
 */
export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const kindRaw = request.nextUrl.searchParams.get('kind');
  if (kindRaw !== 'front' && kindRaw !== 'back' && kindRaw !== 'selfie') {
    return NextResponse.json({ error: 'invalid_kind' }, { status: 400 });
  }
  const kind = kindRaw as KycDocKind;

  const kyc = await prisma.userKyc.findUnique({
    where: { userId },
    select: { documentFrontUrl: true, documentBackUrl: true, selfieUrl: true },
  });
  if (!kyc) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const filename = kind === 'front'
    ? kyc.documentFrontUrl
    : kind === 'back'
      ? kyc.documentBackUrl
      : kyc.selfieUrl;
  if (!filename) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  const file = await readKycDoc({ userId, filename });
  if (!file) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  return new NextResponse(file.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': file.mime,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'private, max-age=300, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
