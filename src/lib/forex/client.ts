/**
 * Low-level forex backend HTTP client.
 *
 * Resolves base URL from `VPS1_FOREX_URL` / `VPS1_BACKEND_URL`, attaches
 * the supplied auth header (Bearer JWT or X-API-Token), and normalises
 * error responses into `ForexApiError` so callers can pattern-match on
 * the stable `code` (e.g. `AUTH_LOGIN_FAILED`, `TIER_UPGRADE_NO_DOWNGRADE`).
 */

import { ForexApiError, type ForexErrorEnvelope } from './types';

const DEFAULT_TIMEOUT_MS = 15_000;

function resolveBaseUrl(): string {
  const url = process.env.VPS1_FOREX_URL || process.env.VPS1_BACKEND_URL;
  if (!url) {
    throw new ForexApiError(503, {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Forex backend URL not configured (VPS1_FOREX_URL / VPS1_BACKEND_URL).',
    });
  }
  return url.replace(/\/+$/, '');
}

export type ForexAuth =
  | { type: 'bearer'; accessToken: string }
  | { type: 'api_token'; apiToken: string }
  | { type: 'none' };

export interface ForexRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  path: string;
  auth?: ForexAuth;
  body?: unknown;
  timeoutMs?: number;
  /** Append query parameters (skips undefined / null values). */
  query?: Record<string, string | number | undefined | null>;
}

function buildHeaders(auth: ForexAuth | undefined, hasBody: boolean): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'babahalgo-frontend/1.0',
  };
  if (hasBody) headers['Content-Type'] = 'application/json';
  if (auth?.type === 'bearer') {
    headers.Authorization = `Bearer ${auth.accessToken}`;
  } else if (auth?.type === 'api_token') {
    headers['X-API-Token'] = auth.apiToken;
  }
  return headers;
}

function buildUrl(path: string, query?: ForexRequestOptions['query']): string {
  const base = resolveBaseUrl();
  const trimmed = path.startsWith('/') ? path : `/${path}`;
  if (!query) return `${base}${trimmed}`;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue;
    params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${base}${trimmed}?${qs}` : `${base}${trimmed}`;
}

async function parseEnvelope(res: Response): Promise<ForexErrorEnvelope> {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
      const detail = (data as Record<string, unknown>).detail;
      if (detail && typeof detail === 'object') {
        return detail as ForexErrorEnvelope;
      }
      if ((data as ForexErrorEnvelope).code) {
        return data as ForexErrorEnvelope;
      }
      return {
        code: 'UNKNOWN',
        message: String((data as Record<string, unknown>).message ?? res.statusText),
      };
    }
  } catch {
    // fall through
  }
  return { code: 'UNKNOWN', message: res.statusText || 'Unknown forex backend error' };
}

export async function forexRequest<T>(opts: ForexRequestOptions): Promise<T> {
  const method = opts.method || 'GET';
  const hasBody = opts.body !== undefined && opts.body !== null;
  const url = buildUrl(opts.path, opts.query);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      headers: buildHeaders(opts.auth, hasBody),
      body: hasBody ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) {
      const envelope = await parseEnvelope(res);
      throw new ForexApiError(res.status, envelope);
    }
    if (res.status === 204) return undefined as T;
    const data = (await res.json()) as T;
    return data;
  } catch (err) {
    if (err instanceof ForexApiError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ForexApiError(504, {
        code: 'SERVICE_UNAVAILABLE',
        message: 'Forex backend timed out — please retry shortly.',
      });
    }
    throw new ForexApiError(503, {
      code: 'SERVICE_UNAVAILABLE',
      message: err instanceof Error ? err.message : 'Forex backend unreachable',
    });
  } finally {
    clearTimeout(timer);
  }
}
