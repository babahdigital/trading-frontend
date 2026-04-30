/**
 * Generic AES-256-GCM encryption util untuk secrets di DB (SiteSetting,
 * VPS admin token, dst). Pakai LICENSE_MW_MASTER_KEY sebagai master key
 * (di-share antar use-case karena VPS3 cuma satu deployment scope).
 *
 * Format ciphertext-on-disk: "v1:<iv-hex>:<tag-hex>:<ciphertext-hex>"
 * Versioned prefix "v1:" supaya rotasi format depan bisa coexist.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const VERSION = 'v1';

function getMasterKey(): Buffer {
  const raw = process.env.LICENSE_MW_MASTER_KEY;
  if (!raw) {
    throw new Error('LICENSE_MW_MASTER_KEY not set');
  }
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw.length >= 32) {
    const buf = Buffer.from(raw, 'utf8');
    if (buf.length < 32) {
      throw new Error('LICENSE_MW_MASTER_KEY must encode to at least 32 bytes');
    }
    return buf.slice(0, 32);
  }
  throw new Error(
    'LICENSE_MW_MASTER_KEY must be 64 hex chars (preferred) or at least 32 ASCII chars',
  );
}

/**
 * Encrypt plaintext → wrapped string "v1:iv:tag:ciphertext".
 * Cocok disimpan langsung di SiteSetting.value (single column).
 */
export function encryptSecret(plaintext: string): string {
  if (!plaintext) return '';
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt wrapped string. Return empty string kalau format invalid.
 * Backward-compat: kalau input tidak punya prefix "v1:", anggap plaintext
 * (untuk migrasi awal — boleh dihapus setelah backfill).
 */
export function decryptSecret(wrapped: string): string {
  if (!wrapped) return '';
  if (!wrapped.startsWith(`${VERSION}:`)) {
    // Belum ter-encrypt — return as-is (legacy plaintext data)
    return wrapped;
  }
  const parts = wrapped.split(':');
  if (parts.length !== 4) {
    throw new Error('encrypted secret format invalid');
  }
  const [, ivHex, tagHex, cipherHex] = parts;
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Mask secret untuk display di admin UI — show last 4 chars.
 * Misal: "xkeysib-abcd1234..." → "•••••••1234"
 */
export function maskSecret(plaintext: string): string {
  if (!plaintext) return '';
  if (plaintext.length <= 8) return '•'.repeat(plaintext.length);
  return '•'.repeat(plaintext.length - 4) + plaintext.slice(-4);
}
