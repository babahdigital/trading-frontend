export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { saveKycDoc, deleteKycDoc, type KycDocKind } from '@/lib/kyc/storage';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/kyc/upload');

/**
 * POST /api/kyc/upload
 *
 * Multipart body:
 *   - kind: 'front' | 'back' | 'selfie'
 *   - file: image (JPEG/PNG/WebP, max 8MB)
 *
 * Returns: { ok: true, filename, kind }
 *
 * Side effect: kalau user sudah punya file dengan kind yang sama di DB,
 * file lama dihapus dari storage (replace semantics).
 *
 * Auth: requires x-user-id header (set by middleware).
 * Blocked if KYC status sudah APPROVED (immutable post-approval).
 */
export async function POST(request: NextRequest) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ code: 'unauthorized', error: 'Unauthorized' }, { status: 401 });

  // Block kalau KYC sudah disetujui — dokumen approved tidak boleh di-rotate
  // via wizard (admin yang harus reset kalau perlu update).
  const existing = await prisma.userKyc.findUnique({
    where: { userId },
    select: { status: true, documentFrontUrl: true, documentBackUrl: true, selfieUrl: true },
  });
  if (existing?.status === 'APPROVED') {
    return NextResponse.json({ code: 'already_approved', error: 'KYC sudah disetujui — hubungi support untuk update dokumen.' }, { status: 409 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_multipart' }, { status: 400 });
  }

  const kindRaw = formData.get('kind');
  const file = formData.get('file');

  if (typeof kindRaw !== 'string' || (kindRaw !== 'front' && kindRaw !== 'back' && kindRaw !== 'selfie')) {
    return NextResponse.json({ code: 'bad_request', error: 'invalid_kind' }, { status: 400 });
  }
  const kind = kindRaw as KycDocKind;

  if (!(file instanceof File)) {
    return NextResponse.json({ code: 'bad_request', error: 'file_required' }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let saved;
  try {
    saved = await saveKycDoc({ userId, kind, buffer });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'save_failed';
    return NextResponse.json({ error: 'invalid_file', message }, { status: 400 });
  }

  // Replace old filename — keep only latest per kind
  const oldFilename = kind === 'front'
    ? existing?.documentFrontUrl
    : kind === 'back'
      ? existing?.documentBackUrl
      : existing?.selfieUrl;

  if (oldFilename && oldFilename !== saved.filename) {
    await deleteKycDoc({ userId, filename: oldFilename }).catch(() => undefined);
  }

  // Upsert DB record with filename only (NOT full path — read endpoint
  // reconstructs path from userId + filename).
  const updateData = {
    [kind === 'front' ? 'documentFrontUrl' : kind === 'back' ? 'documentBackUrl' : 'selfieUrl']: saved.filename,
  };

  await prisma.userKyc.upsert({
    where: { userId },
    create: {
      userId,
      // Schema enum tidak punya DRAFT — keep NOT_SUBMITTED sampai user
      // submit form lengkap. Doc URLs sudah persist, jadi resume aman.
      status: 'NOT_SUBMITTED',
      ...updateData,
    },
    update: updateData,
  });

  log.info(`kyc doc uploaded — user=${userId} kind=${kind} size=${saved.size} mime=${saved.mime}`);

  return NextResponse.json({
    ok: true,
    kind,
    filename: saved.filename,
    size: saved.size,
    mime: saved.mime,
  });
}
