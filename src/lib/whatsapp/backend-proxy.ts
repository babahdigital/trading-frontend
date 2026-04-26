/**
 * Server-side proxy helpers for the WhatsApp config endpoints.
 *
 * Forex backend exposes:
 *   GET /api/forex/tenant/whatsapp
 *   PATCH /api/forex/tenant/whatsapp
 *
 * Crypto backend WA endpoint is pending — calls return 503 gracefully so
 * the FE UI can render a "coming soon" state without throwing.
 *
 * Forex auth: X-API-Token (admin scope shared via `vps1/client.ts`).
 * Crypto auth: scoped tokens via `proxy/crypto-client.ts` (when wired).
 */

import { proxyToCryptoBackend } from '@/lib/proxy/crypto-client';
import type { WaProduct, WhatsappConfig, WhatsappConfigPatch } from './types';

const FOREX_BASE_URL_ENV = 'VPS1_BACKEND_URL';
const FOREX_TOKEN_ENVS = ['VPS1_TOKEN_TENANT_ADMIN', 'VPS1_ADMIN_TOKEN'] as const;

interface ForexConfigDto {
  addon_active: boolean;
  enabled: boolean;
  alerts_target: string | null;
  ops_target: string | null;
  digest_target: string | null;
  country_code: string;
  provider: string;
}

function forexConfigured(): boolean {
  return Boolean(
    process.env[FOREX_BASE_URL_ENV] &&
      FOREX_TOKEN_ENVS.some((key) => process.env[key]),
  );
}

function forexToken(): string | null {
  for (const key of FOREX_TOKEN_ENVS) {
    const value = process.env[key];
    if (value) return value;
  }
  return null;
}

function fromForex(dto: ForexConfigDto): WhatsappConfig {
  return {
    addonActive: Boolean(dto.addon_active),
    enabled: Boolean(dto.enabled),
    alertsTarget: dto.alerts_target ?? null,
    opsTarget: dto.ops_target ?? null,
    digestTarget: dto.digest_target ?? null,
    countryCode: dto.country_code || '62',
    provider: (dto.provider === 'twilio' || dto.provider === 'fonnte' || dto.provider === 'disabled')
      ? dto.provider
      : 'disabled',
  };
}

function toForexPatch(patch: WhatsappConfigPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.enabled !== undefined) out.enabled = patch.enabled;
  if (patch.alertsTarget !== undefined) out.alerts_target = patch.alertsTarget;
  if (patch.opsTarget !== undefined) out.ops_target = patch.opsTarget;
  if (patch.digestTarget !== undefined) out.digest_target = patch.digestTarget;
  if (patch.countryCode !== undefined) out.country_code = patch.countryCode;
  return out;
}

interface ForexCallOptions {
  method: 'GET' | 'PATCH';
  userId: string;
  body?: unknown;
}

async function callForex(opts: ForexCallOptions): Promise<{ status: number; data: unknown }> {
  const baseUrl = process.env[FOREX_BASE_URL_ENV];
  const token = forexToken();
  if (!baseUrl || !token) {
    return {
      status: 503,
      data: { error: 'forex_backend_unconfigured' },
    };
  }
  const url = `${baseUrl.replace(/\/$/, '')}/api/forex/tenant/whatsapp`;
  const res = await fetch(url, {
    method: opts.method,
    headers: {
      'Content-Type': 'application/json',
      'X-API-Token': token,
      'X-Babahalgo-User-Id': opts.userId,
      'User-Agent': 'babahalgo-frontend/1.0',
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(10_000),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function callCrypto(method: 'GET' | 'PATCH', userId: string, body?: unknown) {
  // Crypto WA endpoint TBD. We attempt a sensible path; 404/405 surface as
  // 503 so the FE renders "coming soon" instead of an error toast.
  const res = await proxyToCryptoBackend({
    scope: 'admin',
    method,
    path: '/api/tenants/me/whatsapp',
    body,
    forwardUserId: userId,
    timeoutMs: 10_000,
  });
  if (res.status === 404 || res.status === 405) {
    return { status: 503, data: { error: 'crypto_whatsapp_endpoint_pending' } };
  }
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

export async function fetchWhatsappConfig(
  product: WaProduct,
  userId: string,
): Promise<{ ok: true; config: WhatsappConfig } | { ok: false; status: number; error: string }> {
  const call = product === 'crypto' ? callCrypto('GET', userId) : callForex({ method: 'GET', userId });
  const { status, data } = await call;
  if (status >= 400) {
    return {
      ok: false,
      status: status >= 500 ? 503 : status,
      error: extractError(data, product),
    };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, status: 502, error: 'invalid_backend_response' };
  }
  return { ok: true, config: fromForex(data as ForexConfigDto) };
}

export async function updateWhatsappConfig(
  product: WaProduct,
  userId: string,
  patch: WhatsappConfigPatch,
): Promise<{ ok: true; config: WhatsappConfig } | { ok: false; status: number; error: string }> {
  const body = toForexPatch(patch);
  const call = product === 'crypto'
    ? callCrypto('PATCH', userId, body)
    : callForex({ method: 'PATCH', userId, body });
  const { status, data } = await call;
  if (status >= 400) {
    return {
      ok: false,
      status: status >= 500 ? 503 : status,
      error: extractError(data, product),
    };
  }
  if (!data || typeof data !== 'object') {
    return { ok: false, status: 502, error: 'invalid_backend_response' };
  }
  return { ok: true, config: fromForex(data as ForexConfigDto) };
}

function extractError(data: unknown, product: WaProduct): string {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error?: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  return product === 'crypto' ? 'crypto_whatsapp_endpoint_pending' : 'forex_request_failed';
}

export { forexConfigured };
