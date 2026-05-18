/**
 * Forex backend billing + tier upgrade client.
 *
 * Endpoints (Phase 14V):
 *   - POST /api/forex/billing/checkout    (TASK 233 — Midtrans Snap)
 *   - POST /api/forex/me/tier/upgrade     (TASK 235 — shared CheckoutService)
 *
 * Both produce a `redirect_url` the FE redirects the browser to; the
 * settlement webhook (POST /api/forex/billing/webhook/{midtrans|xendit})
 * promotes `commerce.subscriptions` + `trading.tenants.tier` atomically.
 */

import { forexRequest } from './client';
import type {
  ForexCheckoutResponse,
  ForexTierUpgradeResponse,
  UpgradeableTier,
} from './types';

export async function forexCreateCheckout(args: {
  accessToken: string;
  targetTier: UpgradeableTier;
  currency?: 'IDR';
}): Promise<ForexCheckoutResponse> {
  return forexRequest<ForexCheckoutResponse>({
    method: 'POST',
    path: '/api/forex/billing/checkout',
    auth: { type: 'bearer', accessToken: args.accessToken },
    body: {
      target_tier: args.targetTier,
      currency: args.currency || 'IDR',
    },
  });
}

export async function forexInitiateTierUpgrade(args: {
  accessToken: string;
  targetTier: UpgradeableTier;
}): Promise<ForexTierUpgradeResponse> {
  return forexRequest<ForexTierUpgradeResponse>({
    method: 'POST',
    path: '/api/forex/me/tier/upgrade',
    auth: { type: 'bearer', accessToken: args.accessToken },
    body: { target_tier: args.targetTier },
  });
}
