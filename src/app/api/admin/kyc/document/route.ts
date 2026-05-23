export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { readKycDoc, type KycDocKind } from '@/lib/kyc/storage';
import { requireAdmin } from '@/lib/auth/require-admin';

/**
 * GET /api/admin/kyc/document?kycId={id}&kind=front|back|selfie
 *
 * Admin-only stream KYC document untuk review purposes.
 *
 * Note: kycId (UserKyc.id) bukan userId — admin tidak perlu tahu mapping
 * langsung; lookup userId dari UserKyc record.
 */
export async function GET(request: NextRequest) {
  try {
  const guard = requireAdmin(request);
  if (guard) return guard;

  const kycId = request.nextUrl.searchParams.get('kycId');
  const kindRaw = request.nextUrl.searchParams.get('kind');

  if (!kycId) return NextResponse.json({ code: 'bad_request', error: 'kycId_required' }, { status: 400 });
  if (kindRaw !== 'front' && kindRaw !== 'back' && kindRaw !== 'selfie') {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_kind' }, { status: 400 });
  }
  const kind = kindRaw as KycDocKind;

  const kyc = await prisma.userKyc.findUnique({
    where: { id: kycId },
    select: {
      userId: true,
      documentFrontUrl: true,
      documentBackUrl: true,
      selfieUrl: true,
    },
  });
  if (!kyc) return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });

  const filename = kind === 'front'
    ? kyc.documentFrontUrl
    : kind === 'back'
      ? kyc.documentBackUrl
      : kyc.selfieUrl;
  if (!filename) return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });

  const file = await readKycDoc({ userId: kyc.userId, filename });
  if (!file) return NextResponse.json({ code: 'not_found', error: 'not_found' }, { status: 404 });

  return new NextResponse(file.buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': file.mime,
      'Content-Length': String(file.buffer.length),
      'Cache-Control': 'private, max-age=60, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ code: 'internal_error', error: message }, { status: 500 });
  }
}
