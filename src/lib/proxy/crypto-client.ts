/**
 * Trading-crypto backend proxy.
 *
 * Mirrors `vps-client.ts` pattern but for the crypto FastAPI backend
 * (port 8100). Per BABAHALGO_INTEGRATION.md (trading-crypto/docs §2.3).
 *
 * Token scopes: signals (read feed), trades (history + equity), keys
 * (encrypt/store), admin (kill switch, tenant ops).
 */

export type CryptoScope = 'signals' | 'trades' | 'keys' | 'admin';

const SCOPE_ENV: Record<CryptoScope, string> = {
  signals: 'CRYPTO_TOKEN_SIGNALS',
  trades: 'CRYPTO_TOKEN_TRADES',
  keys: 'CRYPTO_TOKEN_KEYS',
  admin: 'CRYPTO_TOKEN_ADMIN',
};

export interface CryptoProxyOptions {
  scope: CryptoScope;
  path: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /**
   * FE user ID — di FE arsitektur saat ini user.id === tenant.id.
   * Akan di-set di header `X-Babahalgo-User-Id` (legacy) DAN `X-Tenant-Id`
   * (canonical, dipakai backend rc24+ untuk RLS gate).
   */
  forwardUserId?: string;
  /**
   * Override explicit tenant ID (kalau berbeda dari forwardUserId).
   * Default = forwardUserId. Backend butuh `X-Tenant-Id` header untuk
   * semua endpoint `/api/tenants/{id}/*` (RLS gate). Tanpa header ini,
   * backend rc24+ return 422/403.
   */
  tenantId?: string;
  requestId?: string;
  timeoutMs?: number;
}

export async function proxyToCryptoBackend(opts: CryptoProxyOptions): Promise<Response> {
  const baseUrl = process.env.CRYPTO_BACKEND_URL;
  const token = process.env[SCOPE_ENV[opts.scope]];

  if (!baseUrl || !token) {
    return new Response(
      JSON.stringify({
        error: 'crypto_backend_unconfigured',
        message: `Crypto backend or scope token "${opts.scope}" not configured`,
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const url = `${baseUrl.replace(/\/$/, '')}${opts.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Token': token,
    'User-Agent': 'babahalgo-frontend/1.0',
  };
  // Tenant ID resolution: explicit tenantId > forwardUserId (default).
  // Backend rc24+ wajib X-Tenant-Id untuk RLS gate di semua endpoint
  // /api/tenants/{id}/*. Legacy X-Babahalgo-User-Id tetap dikirim untuk
  // backward compat selama transition window.
  const tenantId = opts.tenantId ?? opts.forwardUserId;
  if (tenantId) {
    headers['X-Tenant-Id'] = tenantId;
  }
  if (opts.forwardUserId) {
    headers['X-Babahalgo-User-Id'] = opts.forwardUserId;
  }
  if (opts.requestId) headers['X-Request-ID'] = opts.requestId;

  return fetch(url, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    signal: AbortSignal.timeout(opts.timeoutMs ?? 15_000),
  });
}

export function cryptoBackendConfigured(): boolean {
  return Boolean(process.env.CRYPTO_BACKEND_URL && process.env.CRYPTO_TOKEN_SIGNALS);
}
