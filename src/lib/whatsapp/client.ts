'use client';

import type {
  WaProduct,
  WhatsappConfig,
  WhatsappConfigPatch,
  ValidateNumberResult,
  OtpRequestResult,
  OtpConfirmResult,
} from './types';
import { WhatsappAdapterError } from './types';

/**
 * Browser-side adapter that talks to the Next.js BFF at
 * `/api/client/whatsapp/*`. The BFF in turn proxies to the relevant
 * backend (forex/crypto) or to Fonnte server-to-server. The browser
 * never sees the Fonnte API token.
 */

async function jsonFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const contentType = res.headers.get('content-type') ?? '';
  const body = contentType.includes('application/json') ? await res.json().catch(() => null) : null;
  if (!res.ok) {
    const message = (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string')
      ? body.error
      : `Request failed with ${res.status}`;
    throw new WhatsappAdapterError(res.status, message, body);
  }
  return body as T;
}

export function getWhatsappConfig(product: WaProduct): Promise<WhatsappConfig> {
  return jsonFetch<WhatsappConfig>(`/api/client/whatsapp/config?product=${product}`);
}

export function patchWhatsappConfig(product: WaProduct, patch: WhatsappConfigPatch): Promise<WhatsappConfig> {
  return jsonFetch<WhatsappConfig>(`/api/client/whatsapp/config?product=${product}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function validateWhatsappNumber(e164: string): Promise<ValidateNumberResult> {
  return jsonFetch<ValidateNumberResult>('/api/client/whatsapp/validate', {
    method: 'POST',
    body: JSON.stringify({ e164 }),
  });
}

export function requestWhatsappOtp(product: WaProduct, e164: string): Promise<OtpRequestResult> {
  return jsonFetch<OtpRequestResult>('/api/client/whatsapp/verify', {
    method: 'POST',
    body: JSON.stringify({ product, e164 }),
  });
}

export function confirmWhatsappOtp(
  product: WaProduct,
  verificationId: string,
  otp: string,
  routingTarget: 'alerts' | 'ops' | 'digest',
): Promise<OtpConfirmResult> {
  return jsonFetch<OtpConfirmResult>('/api/client/whatsapp/verify/confirm', {
    method: 'POST',
    body: JSON.stringify({ product, verificationId, otp, routingTarget }),
  });
}

export { WhatsappAdapterError };
export type { WhatsappConfig, WhatsappConfigPatch, ValidateNumberResult, OtpRequestResult, OtpConfirmResult, WaProduct };
