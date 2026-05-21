/**
 * Runtime file server untuk `/api/uploads/promotions/<filename>`.
 *
 * Why ada route ini: Next.js standalone build cache directory listing `public/`
 * saat container startup. File yang ditulis di runtime via image-generator
 * (waktu strategist trigger atau admin generate) tidak ter-detect sampai container
 * restart, sehingga `/uploads/promotions/foo.jpg` → 404 walaupun file ada di
 * `/app/public/uploads/promotions/foo.jpg`.
 *
 * Solusi: stream langsung dari disk lewat API route handler. Bypass static cache.
 *
 * Security:
 *   - Filename validation: hanya `[a-z0-9-.]+\.(jpg|jpeg|png|webp)`
 *   - Path traversal block: `.` di awal atau `..` di mana saja → 400
 *   - Read-only — POST/PUT/DELETE tidak di-handle (405)
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { readFile, stat } from 'fs/promises';
import path from 'path';
import { NextResponse } from 'next/server';

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'promotions');

const FILENAME_RE = /^[a-z0-9][a-z0-9\-._]{0,200}\.(jpg|jpeg|png|webp)$/i;

const CONTENT_TYPE: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const { filename } = await params;

  if (!filename || !FILENAME_RE.test(filename) || filename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
  }

  const fullPath = path.join(UPLOAD_DIR, filename);

  // Defensive resolve untuk memastikan tidak escape UPLOAD_DIR
  const resolved = path.resolve(fullPath);
  if (!resolved.startsWith(path.resolve(UPLOAD_DIR))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const stats = await stat(resolved);
    if (!stats.isFile()) {
      return NextResponse.json({ error: 'Not a file' }, { status: 404 });
    }
    const buffer = await readFile(resolved);
    const ext = path.extname(filename).toLowerCase();
    const contentType = CONTENT_TYPE[ext] ?? 'application/octet-stream';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stats.size),
        // Cache 1h browser, 1d CDN (gambar promo bisa di-rotate harian)
        'Cache-Control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
        'Last-Modified': stats.mtime.toUTCString(),
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
