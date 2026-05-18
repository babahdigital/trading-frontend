/**
 * Forex backend (`/api/forex/*`) shared types & error contracts.
 *
 * Backend source: `trading-forex/src/i18n/codes.py` (Phase 14V TASK 234/233/235,
 * shipped 2026-05-18 in commit 7ecea40). Frontend reads stable `code` strings
 * and resolves them via i18n bundle so messages stay locale-aware.
 */

export type ForexTier = 'beta' | 'starter' | 'pro' | 'vip' | 'dedicated';

/** Tiers the customer can self-upgrade to via /me/tier/upgrade or /billing/checkout. */
export type UpgradeableTier = 'starter' | 'pro' | 'vip' | 'dedicated';

export const UPGRADEABLE_TIERS: UpgradeableTier[] = ['starter', 'pro', 'vip', 'dedicated'];

/**
 * Authoritative price book lives in the backend
 * (`commerce/checkout_schemas.py:CHECKOUT_TIER_PRICE_IDR`); FE never
 * stores price values inline — the UI fetches them from the DB-backed
 * `/api/portal/billing/tiers` endpoint so admins can edit pricing via
 * the CMS without a code change.
 */

/** Backend error envelope (build_error_payload output). */
export interface ForexErrorEnvelope {
  code: string;
  message: string;
  message_key?: string;
  details?: Record<string, unknown>;
}

export class ForexApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly envelope: ForexErrorEnvelope,
  ) {
    super(envelope.message || `forex API error (${envelope.code})`);
    this.name = 'ForexApiError';
  }

  get code(): string {
    return this.envelope.code;
  }

  get retryAfterSeconds(): number | null {
    const raw = this.envelope.details?.retry_after_seconds;
    return typeof raw === 'number' ? raw : null;
  }
}

export interface ForexLoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  refresh_expires_in: number;
}

export interface ForexTierUpgradeResponse {
  redirect_url: string;
  external_order_id: string;
  current_tier: string;
  target_tier: UpgradeableTier;
  expires_at: string;
  duplicate_pending: boolean;
}

export interface ForexCheckoutResponse {
  redirect_url: string;
  snap_token: string;
  external_order_id: string;
  amount_idr: number;
  expires_at: string;
  target_tier: string;
}

export interface ForexMeResponse {
  tenant_id: string;
  external_id: string | null;
  tier: string;
  products: string[];
  language: string;
  timezone: string;
  authenticated: boolean;
}

export interface ForexFeatureFlagsResponse {
  engines: { scalper: boolean; swing: boolean };
  ai_advisor: boolean;
  news_pipeline: boolean;
  affiliate_enabled: boolean;
}

/** Public-claim subset of the access JWT payload — safe to decode without
 *  verification on the FE for UI gating. The backend mints these alongside
 *  the signed claims (`auth_jwt.py:_claim_extras`). */
export interface ForexAccessClaims {
  sub: string;
  iat?: number;
  exp?: number;
  token_type?: string;
  tier?: string;
  products?: string[];
  tenant_id?: string;
}

export function decodeForexAccessClaims(token: string): ForexAccessClaims | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = parts[1];
    const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalised + '==='.slice((normalised.length + 3) % 4);
    const json = typeof atob === 'function'
      ? atob(padded)
      : Buffer.from(padded, 'base64').toString('utf-8');
    return JSON.parse(json) as ForexAccessClaims;
  } catch {
    return null;
  }
}

/** Whether the access token is within 60 seconds of expiry. Use this to
 *  decide if a refresh should be triggered server-side before proxying. */
export function isAccessTokenExpiring(token: string, leewaySeconds = 60): boolean {
  const claims = decodeForexAccessClaims(token);
  if (!claims?.exp) return true;
  const nowSec = Math.floor(Date.now() / 1000);
  return claims.exp - nowSec <= leewaySeconds;
}
