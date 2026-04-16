import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';

const ALGORITHM = 'aes-256-gcm';

function getMasterKey(): Buffer {
  const key = process.env.LICENSE_MW_MASTER_KEY;
  if (!key || key.length < 32) {
    throw new Error('LICENSE_MW_MASTER_KEY must be at least 32 hex chars');
  }
  return Buffer.from(key.slice(0, 32), 'hex').length === 16
    ? Buffer.from(key.slice(0, 64), 'hex')
    : Buffer.from(key.padEnd(32, '0'));
}

export function encryptAdminToken(plaintext: string): {
  ciphertext: string;
  iv: string;
  tag: string;
} {
  const key = getMasterKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();
  return {
    ciphertext: encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

export function decryptAdminToken(ciphertext: string, iv: string, tag: string): string {
  const key = getMasterKey();
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export async function proxyToVpsBackend(
  vpsInstanceId: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const vps = await prisma.vpsInstance.findUniqueOrThrow({
    where: { id: vpsInstanceId },
  });

  if (vps.status !== 'ONLINE') {
    return new Response(JSON.stringify({ error: 'VPS is not online', status: vps.status }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const adminToken = decryptAdminToken(
    vps.adminTokenCiphertext,
    vps.adminTokenIv,
    vps.adminTokenTag
  );

  const url = `${vps.backendBaseUrl}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers as HeadersInit || {}).entries()),
      'X-API-Token': adminToken,
      'User-Agent': 'license-middleware/1.0',
    },
    signal: AbortSignal.timeout(15_000),
  });

  return response;
}

// Proxy to master backend (Model B PAMM) using env-based token
export async function proxyToMasterBackend(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const baseUrl = process.env.VPS1_BACKEND_URL;
  const token = process.env.VPS1_ADMIN_TOKEN;

  if (!baseUrl || !token) {
    return new Response(
      JSON.stringify({ error: 'Master backend not configured' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = `${baseUrl}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      ...Object.fromEntries(new Headers(init.headers as HeadersInit || {}).entries()),
      'X-API-Token': token,
      'User-Agent': 'license-middleware/1.0',
    },
    signal: AbortSignal.timeout(15_000),
  });
}
