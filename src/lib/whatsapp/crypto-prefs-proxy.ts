/**
 * Server-side proxy for the *crypto* notification preferences endpoint.
 *
 * Crypto backend (per `CRYPTO_2026_04_27_NOTIFICATION_PREFERENCES.md`) exposes a
 * unified Telegram + WhatsApp + per-event mute matrix at:
 *   GET   /api/tenants/{tenant_id}/notification-preferences
 *   PATCH /api/tenants/{tenant_id}/notification-preferences
 *   POST  /api/tenants/{tenant_id}/notification-preferences/whatsapp/verify
 *   POST  /api/tenants/{tenant_id}/notification-preferences/whatsapp/confirm
 *
 * Auth: per-tenant scoped token (X-API-Token header, scope=keys).
 * Tenant resolution: caller supplies tenantId from `requireCryptoEligible`.
 */

import { proxyToCryptoBackend } from '@/lib/proxy/crypto-client';
import type {
  CryptoNotificationPrefs,
  CryptoNotificationPrefsPatch,
  CryptoOtpConfirmResult,
  CryptoOtpVerifyResult,
} from './types';

interface CryptoPrefsDto {
  tenant_id: number;
  telegram_enabled: boolean;
  telegram_chat_id: string | null;
  whatsapp_enabled: boolean;
  whatsapp_number: string | null;
  whatsapp_verified: boolean;
  whatsapp_verified_at: string | null;
  event_optouts: Record<string, boolean>;
  notification_lang: string;
}

function fromDto(dto: CryptoPrefsDto): CryptoNotificationPrefs {
  return {
    tenantId: dto.tenant_id,
    telegramEnabled: Boolean(dto.telegram_enabled),
    telegramChatId: dto.telegram_chat_id ?? null,
    whatsappEnabled: Boolean(dto.whatsapp_enabled),
    whatsappNumber: dto.whatsapp_number ?? null,
    whatsappVerified: Boolean(dto.whatsapp_verified),
    whatsappVerifiedAt: dto.whatsapp_verified_at ?? null,
    eventOptouts: dto.event_optouts ?? {},
    notificationLang: dto.notification_lang ?? 'id',
  };
}

function toDtoPatch(patch: CryptoNotificationPrefsPatch): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.telegramEnabled !== undefined) out.telegram_enabled = patch.telegramEnabled;
  if (patch.whatsappEnabled !== undefined) out.whatsapp_enabled = patch.whatsappEnabled;
  if (patch.whatsappNumber !== undefined) out.whatsapp_number = patch.whatsappNumber;
  if (patch.eventOptouts !== undefined) out.event_optouts = patch.eventOptouts;
  return out;
}

interface CryptoCallResult<T> {
  ok: true;
  data: T;
}
interface CryptoCallFail {
  ok: false;
  status: number;
  error: string;
  detail?: unknown;
}

async function call<T>(
  method: 'GET' | 'PATCH' | 'POST',
  tenantId: number | string,
  userId: string,
  pathSuffix: string,
  body?: unknown,
): Promise<CryptoCallResult<T> | CryptoCallFail> {
  const res = await proxyToCryptoBackend({
    scope: 'keys',
    method,
    path: `/api/tenants/${encodeURIComponent(String(tenantId))}/notification-preferences${pathSuffix}`,
    body,
    forwardUserId: userId,
    timeoutMs: 10_000,
  });

  const raw = await res.text();
  let parsed: unknown = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      error: extractError(parsed, res.status),
      detail: parsed,
    };
  }

  return { ok: true, data: parsed as T };
}

function extractError(data: unknown, status: number): string {
  if (data && typeof data === 'object' && 'detail' in data) {
    const detail = (data as { detail: unknown }).detail;
    if (typeof detail === 'string') return detail;
  }
  if (data && typeof data === 'object' && 'error' in data) {
    const err = (data as { error: unknown }).error;
    if (typeof err === 'string') return err;
  }
  if (status === 404) return 'crypto_endpoint_not_found';
  if (status === 503) return 'crypto_backend_unconfigured';
  return 'crypto_request_failed';
}

export async function fetchCryptoNotificationPrefs(
  tenantId: number | string,
  userId: string,
): Promise<{ ok: true; prefs: CryptoNotificationPrefs } | { ok: false; status: number; error: string }> {
  const result = await call<CryptoPrefsDto>('GET', tenantId, userId, '');
  if (!result.ok) return result;
  if (!result.data || typeof result.data !== 'object') {
    return { ok: false, status: 502, error: 'invalid_backend_response' };
  }
  return { ok: true, prefs: fromDto(result.data) };
}

export async function updateCryptoNotificationPrefs(
  tenantId: number | string,
  userId: string,
  patch: CryptoNotificationPrefsPatch,
): Promise<{ ok: true; prefs: CryptoNotificationPrefs } | { ok: false; status: number; error: string }> {
  const body = toDtoPatch(patch);
  const result = await call<CryptoPrefsDto>('PATCH', tenantId, userId, '', body);
  if (!result.ok) return result;
  if (!result.data || typeof result.data !== 'object') {
    return { ok: false, status: 502, error: 'invalid_backend_response' };
  }
  return { ok: true, prefs: fromDto(result.data) };
}

export async function requestCryptoWhatsappOtp(
  tenantId: number | string,
  userId: string,
): Promise<{ ok: true; result: CryptoOtpVerifyResult } | { ok: false; status: number; error: string }> {
  const result = await call<{ status: string; detail?: string; message?: string }>(
    'POST',
    tenantId,
    userId,
    '/whatsapp/verify',
    {},
  );
  if (!result.ok) return result;
  return {
    ok: true,
    result: {
      status: result.data?.status ?? 'unknown',
      detail: result.data?.detail,
      message: result.data?.message,
    },
  };
}

export async function confirmCryptoWhatsappOtp(
  tenantId: number | string,
  userId: string,
  code: string,
): Promise<{ ok: true; result: CryptoOtpConfirmResult } | { ok: false; status: number; error: string }> {
  const result = await call<{ status: string; verified_at?: string }>(
    'POST',
    tenantId,
    userId,
    '/whatsapp/confirm',
    { code },
  );
  if (!result.ok) return result;
  return {
    ok: true,
    result: {
      status: (result.data?.status as 'verified') ?? 'unknown',
      verifiedAt: result.data?.verified_at,
    },
  };
}
