/**
 * Runtime file server untuk `/api/uploads/invoices/<filename>`.
 *
 * Pattern sama dengan promo image route — Next.js standalone cache `public/`
 * listing saat startup. PDF invoice di-generate runtime saat webhook PAID,
 * harus served via API route untuk bypass static cache.
 *
 * Security:
 *   - Filename pattern: `[a-z0-9-._]+\.pdf` only
 *   - Path traversal block via path.resolve check
 *   - Auth: TIDAK gated (invoice IDs random per checkout, customer share
 *     link via email — public access OK with secret-like URL).
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'invoices');

const FILENAME_RE = /^[A-Za-z0-9][A-Za-z0-9\-._]{0,200}\.pdf$/i;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!filename || !FILENAME_RE.test(filename) || filename.includes('..')) {
    return NextResponse.json({ code: 'bad_request', error: 'Invalid filename' }, { status: 400 });
  }

  const fullPath = path.join(UPLOAD_DIR, filename);
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return NextResponse.json({ code: 'forbidden', error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) {
      return NextResponse.json({ code: 'not_found', error: 'Not a file' }, { status: 404 });
    }
    const buffer = await readFile(resolved);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Length': String(stats.size),
        'Content-Disposition': `inline; filename="${filename}"`,
        // Invoice PDF immutable per-id (regen kalau ada perubahan) — cache aggressive
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, immutable',
        'Last-Modified': stats.mtime.toUTCString(),
      },
    });
  } catch {
    return NextResponse.json({ code: 'not_found', error: 'Not found' }, { status: 404 });
  }
}
