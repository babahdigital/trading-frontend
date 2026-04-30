import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { prisma } from '@/lib/db/prisma';

const ALGORITHM = 'aes-256-gcm';

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
    'LICENSE_MW_MASTER_KEY must be 64 hex chars (preferred) or at least 32 ASCII chars'
  );
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

// Scoped token mapping — least-privilege access to VPS1 commercial endpoints.
//
// Notes pasca Wave-29S-D (2026-04-30):
// - `pamm` scope DEPRECATED — PAMM tier dihentikan, endpoint /api/pamm/* tidak
//   ada lagi di backend. Scope masih dipertahankan untuk back-compat call
//   site (resolve fallback ke admin token) sampai semua FE proxy sudah
//   migrate ke `tenant` scope dan path /api/forex/positions/*.
// - `tenant` scope BARU — untuk endpoint tenant-scoped /api/forex/me/* dan
//   /api/forex/positions/*. Idealnya pakai per-user X-API-Token (P0-3 audit),
//   tapi karena infra token issuance per-user belum ada, fallback ke
//   VPS1_ADMIN_TOKEN. Backend `/api/forex/admin/*` endpoint dapat dipakai
//   admin-as-tenant pattern dengan header X-Tenant-Override.
type MasterScope =
  | 'signals'
  | 'trade_events'
  | 'research'
  | 'pamm' // deprecated — fallback ke admin token untuk backward compat
  | 'stats'
  | 'scanner'
  | 'admin'
  | 'tenant'; // tenant-scoped endpoints (positions, kill-switch, me/*)

const SCOPE_TOKEN_MAP: Record<MasterScope, string> = {
  signals: 'VPS1_TOKEN_SIGNALS',
  trade_events: 'VPS1_TOKEN_TRADE_EVENTS',
  research: 'VPS1_TOKEN_RESEARCH',
  pamm: 'VPS1_ADMIN_TOKEN', // deprecated — PAMM scope retired
  stats: 'VPS1_TOKEN_STATS',
  scanner: 'VPS1_TOKEN_SCANNER',
  admin: 'VPS1_ADMIN_TOKEN',
  tenant: 'VPS1_ADMIN_TOKEN', // TODO P0-3: migrate ke per-user tenant token
};

export async function proxyToMasterBackend(
  scope: MasterScope,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const baseUrl = process.env.VPS1_BACKEND_URL;
  const scopedToken = process.env[SCOPE_TOKEN_MAP[scope]];
  const token = scopedToken || process.env.VPS1_ADMIN_TOKEN;

  if (!baseUrl || !token) {
    return new Response(
      JSON.stringify({ error: `Master backend scope "${scope}" not configured` }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const url = `${baseUrl}${path}`;
  // Caller-supplied headers win over defaults — Accept-Timezone is
  // overridable per-request when a tenant has chosen a non-Jakarta zone.
  const callerHeaders = Object.fromEntries(new Headers((init.headers as HeadersInit) || {}).entries());
  return fetch(url, {
    ...init,
    headers: {
      'Accept-Timezone': 'Asia/Jakarta',
      ...callerHeaders,
      'X-API-Token': token,
      'User-Agent': 'vps2-commercial/1.0',
    },
    signal: AbortSignal.timeout(15_000),
  });
}
