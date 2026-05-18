/**
 * Forex backend auth client — bridges the FE session to backend JWT pair
 * (`POST /api/forex/auth/login|refresh|logout`, Phase 14V TASK 234).
 *
 * Usage from FE proxy routes:
 *   1. After FE-side login (email + password) verifies the user, look up
 *      `User.forexApiToken` and call `forexLogin(email, apiToken)`.
 *   2. Persist returned access + refresh tokens in HttpOnly cookies via
 *      `lib/forex/cookies.ts`.
 *   3. On any 401 with code `AUTH_TOKEN_INVALID` / `AUTH_TOKEN_REQUIRED`,
 *      call `forexRefresh(refreshToken)` to rotate; on `AUTH_REFRESH_*`,
 *      clear cookies and force re-login.
 */

import { forexRequest } from './client';
import { ForexApiError, type ForexLoginResponse } from './types';

/**
 * Exchange (email, api_token) for an access+refresh JWT pair.
 * Maps backend `AUTH_LOGIN_FAILED` to a generic 401 — the caller decides
 * whether to surface enumeration-resistant copy.
 */
export async function forexLogin(args: {
  email: string;
  apiToken: string;
}): Promise<ForexLoginResponse> {
  return forexRequest<ForexLoginResponse>({
    method: 'POST',
    path: '/api/forex/auth/login',
    auth: { type: 'none' },
    body: { email: args.email, api_token: args.apiToken },
  });
}

/**
 * Rotate a refresh token for a fresh access+refresh pair. The presented
 * refresh row is one-time-use — re-presentation triggers
 * `AUTH_REFRESH_REPLAYED` and the backend revokes the descendant chain.
 */
export async function forexRefresh(args: {
  refreshToken: string;
}): Promise<ForexLoginResponse> {
  return forexRequest<ForexLoginResponse>({
    method: 'POST',
    path: '/api/forex/auth/refresh',
    auth: { type: 'none' },
    body: { refresh_token: args.refreshToken },
  });
}

/**
 * Revoke a refresh token. Idempotent — already-revoked or unknown rows
 * still return `{revoked: true}` so we don't leak whether the token was
 * real. Requires the access token (Bearer) since backend RLS scopes
 * the revoke to the caller's tenant.
 */
export async function forexLogout(args: {
  accessToken: string;
  refreshToken: string;
}): Promise<{ revoked: boolean }> {
  return forexRequest<{ revoked: boolean }>({
    method: 'POST',
    path: '/api/forex/auth/logout',
    auth: { type: 'bearer', accessToken: args.accessToken },
    body: { refresh_token: args.refreshToken },
  });
}

/**
 * Best-effort logout — swallows transport / auth errors so the FE proxy
 * can always clear cookies even if the backend is unreachable.
 */
export async function forexLogoutSafe(args: {
  accessToken: string;
  refreshToken: string;
}): Promise<void> {
  try {
    await forexLogout(args);
  } catch (err) {
    if (!(err instanceof ForexApiError)) throw err;
    // ignore — caller still clears cookies
  }
}
