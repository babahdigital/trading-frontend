/**
 * KYC doc storage — private FS storage untuk dokumen KYC (KTP/passport + selfie).
 *
 * Storage layout:
 *   {KYC_STORAGE_DIR}/{userId}/{kind}-{nonce}.{ext}
 *
 * Kind = 'front' | 'back' | 'selfie' (saved as filename prefix).
 * Files NEVER served via public route — always via authenticated
 * /api/kyc/document?kind=X (owner) atau /api/admin/kyc/document?id=Y&kind=X (admin).
 *
 * Why FS (bukan S3/R2):
 * - MVP launch first customer — volume sangat kecil (<50/bln estimasi)
 * - Zero vendor cost, zero signup, no API key management
 * - Migration ke object storage trivial nanti (swap implementasi save+read)
 * - Backup sudah ada via R2 offsite (mount data/ ke backup script kalau perlu)
 *
 * Production deploy WAJIB: mount `/opt/trading-commercial/data/kyc` ke Docker
 * volume — jangan biarkan di container ephemeral storage.
 */
import { randomBytes } from 'crypto';
import { mkdir, readFile, writeFile, stat, unlink } from 'fs/promises';
import path from 'path';

export type KycDocKind = 'front' | 'back' | 'selfie';

/** Allowed MIME types (validated by magic bytes, NOT trust header). */
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const MAX_BYTES = 8 * 1024 * 1024; // 8MB — KYC photos kadang besar dari kamera HP

const STORAGE_ROOT = process.env.KYC_STORAGE_DIR
  ?? path.join(process.cwd(), 'data', 'kyc');

/** Detect image type by magic bytes (file signature). Returns null kalau bukan image. */
function detectMime(buf: Buffer): typeof ALLOWED_MIMES[number] | null {
  if (buf.length < 12) return null;
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47
    && buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  // WebP: RIFF....WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46
    && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  return null;
}

function extFromMime(mime: typeof ALLOWED_MIMES[number]): string {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  return 'webp';
}

function sanitizeId(id: string): string {
  // Only allow safe chars; prevent path traversal via userId
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    throw new Error('Invalid userId format');
  }
  return id;
}

function sanitizeKind(k: string): KycDocKind {
  if (k === 'front' || k === 'back' || k === 'selfie') return k;
  throw new Error('Invalid doc kind');
}

export interface SavedKycDoc {
  filename: string;        // e.g. 'front-3f9a1b.jpg' — store in DB
  mime: string;            // resolved by magic bytes
  size: number;
  kind: KycDocKind;
}

/**
 * Save KYC document file. Validates magic bytes, enforces size limit.
 * Throws if invalid.
 */
export async function saveKycDoc(args: {
  userId: string;
  kind: KycDocKind;
  buffer: Buffer;
}): Promise<SavedKycDoc> {
  const userId = sanitizeId(args.userId);
  const kind = sanitizeKind(args.kind);

  if (args.buffer.length === 0) throw new Error('Empty file');
  if (args.buffer.length > MAX_BYTES) {
    throw new Error(`File too large (max ${Math.floor(MAX_BYTES / 1024 / 1024)}MB)`);
  }

  const mime = detectMime(args.buffer);
  if (!mime) throw new Error('Invalid image format (only JPEG/PNG/WebP)');

  const ext = extFromMime(mime);
  const nonce = randomBytes(6).toString('hex');
  const filename = `${kind}-${nonce}.${ext}`;

  const dir = path.join(STORAGE_ROOT, userId);
  await mkdir(dir, { recursive: true });
  const fullPath = path.join(dir, filename);
  await writeFile(fullPath, args.buffer, { mode: 0o600 });

  return { filename, mime, size: args.buffer.length, kind };
}

/**
 * Read KYC document file content. Returns null if not found.
 * Path is reconstructed from userId + filename — defense against
 * path traversal via sanitization.
 */
export async function readKycDoc(args: {
  userId: string;
  filename: string;
}): Promise<{ buffer: Buffer; mime: string } | null> {
  const userId = sanitizeId(args.userId);
  // filename must be of form '{kind}-{nonce}.{ext}'
  if (!/^(front|back|selfie)-[a-f0-9]{12}\.(jpg|png|webp)$/.test(args.filename)) {
    return null;
  }
  const fullPath = path.join(STORAGE_ROOT, userId, args.filename);
  try {
    const buffer = await readFile(fullPath);
    const mime = detectMime(buffer);
    if (!mime) return null;
    return { buffer, mime };
  } catch {
    return null;
  }
}

/** Delete a KYC doc file. Silent on not-found. */
export async function deleteKycDoc(args: {
  userId: string;
  filename: string;
}): Promise<void> {
  const userId = sanitizeId(args.userId);
  if (!/^(front|back|selfie)-[a-f0-9]{12}\.(jpg|png|webp)$/.test(args.filename)) {
    return;
  }
  try {
    await unlink(path.join(STORAGE_ROOT, userId, args.filename));
  } catch {
    // ignore
  }
}

/** Return file stat info, or null if not exists. */
export async function statKycDoc(args: {
  userId: string;
  filename: string;
}): Promise<{ size: number; mtime: Date } | null> {
  const userId = sanitizeId(args.userId);
  if (!/^(front|back|selfie)-[a-f0-9]{12}\.(jpg|png|webp)$/.test(args.filename)) {
    return null;
  }
  try {
    const s = await stat(path.join(STORAGE_ROOT, userId, args.filename));
    return { size: s.size, mtime: s.mtime };
  } catch {
    return null;
  }
}
