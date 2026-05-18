/**
 * Forex backend `/me/*` client — current-tenant identity, features, onboarding.
 *
 * All calls require a Bearer access token; expired tokens raise
 * `AUTH_TOKEN_INVALID` and should be auto-rotated via `forexRefresh`
 * before the caller retries.
 */

import { forexRequest } from './client';
import type {
  ForexFeatureFlagsResponse,
  ForexMeResponse,
} from './types';

export async function forexMe(args: {
  accessToken: string;
}): Promise<ForexMeResponse> {
  return forexRequest<ForexMeResponse>({
    method: 'GET',
    path: '/api/forex/me',
    auth: { type: 'bearer', accessToken: args.accessToken },
  });
}

export async function forexFeatureFlags(args: {
  accessToken: string;
}): Promise<ForexFeatureFlagsResponse> {
  return forexRequest<ForexFeatureFlagsResponse>({
    method: 'GET',
    path: '/api/forex/me/features',
    auth: { type: 'bearer', accessToken: args.accessToken },
  });
}

export interface ForexTradingConfig {
  tenant_id: string;
  enabled_engines: string[];
  enabled_pairs: string[];
}

export async function forexTradingConfig(args: {
  accessToken: string;
}): Promise<ForexTradingConfig> {
  return forexRequest<ForexTradingConfig>({
    method: 'GET',
    path: '/api/forex/me/trading-config',
    auth: { type: 'bearer', accessToken: args.accessToken },
  });
}

export interface ForexOnboardingCheck {
  key: string;
  label: string;
  ok: boolean;
  detail: string | null;
}

export interface ForexOnboardingStatus {
  tenant_id: string;
  tier: string;
  ready: boolean;
  checks: ForexOnboardingCheck[];
}

export async function forexOnboardingStatus(args: {
  accessToken: string;
}): Promise<ForexOnboardingStatus> {
  return forexRequest<ForexOnboardingStatus>({
    method: 'GET',
    path: '/api/forex/me/onboarding-status',
    auth: { type: 'bearer', accessToken: args.accessToken },
  });
}
