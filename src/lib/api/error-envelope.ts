/**
 * API error envelope parser per FRONTEND_DEVELOPMENT_GUIDE §4.4.
 *
 * Backend (trading-forex v2) standardises error bodies as:
 *   {
 *     code:        "PRODUCT_NOT_SUBSCRIBED",
 *     message_key: "errors.products.not_subscribed",
 *     message:     "You are not subscribed to this product",
 *     details:     { product: "signal", tenant_tier: "free" },
 *     request_id:  "req_1a2b3c4d5e",
 *   }
 *
 * This module:
 *   1. Parses any Response into a typed `ApiErrorEnvelope`.
 *   2. Exposes `ApiError` — a subclass of Error carrying the envelope.
 *   3. Provides `renderApiError(err, t)` for use with next-intl to
 *      prefer `message_key` lookup and gracefully fall back to `message`
 *      or an HTTP-status default.
 *
 * Consumers stay decoupled from the transport layer: route handlers
 * parse + throw ApiError; UI components catch + render via translator.
 */

import type { useTranslations } from 'next-intl';

export interface ApiErrorEnvelope {
  code: string;
  message_key?: string;
  message: string;
  details?: Record<string, unknown>;
  request_id?: string;
  http_status: number;
}

export class ApiError extends Error implements ApiErrorEnvelope {
  readonly code: string;
  readonly message_key?: string;
  readonly details?: Record<string, unknown>;
  readonly request_id?: string;
  readonly http_status: number;

  constructor(envelope: ApiErrorEnvelope) {
    super(envelope.message);
    this.name = 'ApiError';
    this.code = envelope.code;
    this.message_key = envelope.message_key;
    this.details = envelope.details;
    this.request_id = envelope.request_id;
    this.http_status = envelope.http_status;
  }

  toJSON(): ApiErrorEnvelope {
    return {
      code: this.code,
      message_key: this.message_key,
      message: this.message,
      details: this.details,
      request_id: this.request_id,
      http_status: this.http_status,
    };
  }
}

/**
 * Attempt to read a non-2xx Response as an ApiErrorEnvelope. Safe to
 * call — always returns an envelope even if body is empty / non-JSON.
 */
export async function parseApiErrorResponse(response: Response): Promise<ApiError> {
  let body: unknown = null;
  try {
    const text = await response.text();
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }

  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    return new ApiError({
      code: typeof b.code === 'string' ? b.code : defaultCodeForStatus(response.status),
      message_key: typeof b.message_key === 'string' ? b.message_key : undefined,
      message:
        typeof b.message === 'string'
          ? b.message
          : typeof b.error === 'string'
            ? b.error
            : response.statusText || `HTTP ${response.status}`,
      details: (b.details ?? undefined) as Record<string, unknown> | undefined,
      request_id: typeof b.request_id === 'string' ? b.request_id : undefined,
      http_status: response.status,
    });
  }

  return new ApiError({
    code: defaultCodeForStatus(response.status),
    message: response.statusText || `HTTP ${response.status}`,
    http_status: response.status,
  });
}

/**
 * Throw ApiError when response is non-2xx, otherwise return the response
 * unchanged. Convenience wrapper for fetch-style flows.
 */
export async function assertOk(response: Response): Promise<Response> {
  if (response.ok) return response;
  throw await parseApiErrorResponse(response);
}

/**
 * Map HTTP status to a default machine-readable code.
 */
export function defaultCodeForStatus(status: number): string {
  if (status === 400) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 409) return 'CONFLICT';
  if (status === 422) return 'VALIDATION_ERROR';
  if (status === 429) return 'RATE_LIMIT_EXCEEDED';
  if (status >= 500) return 'SERVER_ERROR';
  return 'UNKNOWN';
}

type Translator = ReturnType<typeof useTranslations>;

/**
 * Render an ApiError (or any error) into a user-facing string. Uses
 * message_key first if available, then falls back to the explicit
 * message, then to a generic translation based on HTTP status.
 *
 * In server contexts without a next-intl translator, pass `null` as
 * `t` — the function returns the raw `message` unchanged.
 */
export function renderApiError(
  err: unknown,
  t: Translator | null,
): string {
  if (err instanceof ApiError) {
    if (err.message_key && t) {
      const translated = t(err.message_key, { default: err.message } as never);
      if (translated && translated !== err.message_key) return translated;
    }
    if (err.message) return err.message;
    if (t) return t(`errors.${err.code.toLowerCase()}`, { default: err.code } as never);
    return err.code;
  }

  if (err instanceof Error) return err.message;
  return String(err);
}

/**
 * Lightweight i18n fallback map used when the full translator is
 * unavailable (e.g. SSR error boundaries). Keys align with backend
 * message_key convention.
 */
export const FALLBACK_ERROR_MESSAGES: Record<string, string> = {
  'errors.auth.invalid_token': 'Sesi Anda telah habis. Silakan login ulang.',
  'errors.auth.product_not_subscribed': 'Produk ini tidak termasuk dalam langganan Anda.',
  'errors.idempotency.conflict': 'Aksi sebelumnya sudah diproses dengan parameter berbeda.',
  'errors.idempotency.key_required': 'Header Idempotency-Key wajib untuk endpoint ini.',
  'errors.rate_limit.exceeded': 'Terlalu banyak permintaan. Silakan tunggu sebentar dan coba lagi.',
  'errors.validation.invalid_input': 'Data tidak valid.',
  'errors.server.internal': 'Terjadi kesalahan internal. Tim kami sudah diberi tahu.',
};
