import { prisma } from '@/lib/db/prisma';

/**
 * Resolve the license / subscription / VPS claims to stamp on a user's access
 * token, so the edge middleware can inject x-license-id / x-subscription-id /
 * x-vps-instance-id for /api/client/* routing.
 *
 * Without these claims, subscription customers never reach the subscription
 * branch of the client routes (permanent 403), and a token refresh used to drop
 * a license user's claims entirely. Both login and refresh use this single
 * resolver so the access token always reflects the user's current entitlements.
 * (P1-BUG-1)
 */
export interface TokenClaims {
  licenseId?: string;
  vpsInstanceId?: string;
  subscriptionId?: string;
}

export async function resolveTokenClaims(userId: string): Promise<TokenClaims> {
  const [license, subscription] = await Promise.all([
    prisma.license.findFirst({
      where: { userId, status: 'ACTIVE', expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, vpsInstanceId: true },
    }),
    prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    }),
  ]);

  const claims: TokenClaims = {};
  if (license) {
    claims.licenseId = license.id;
    if (license.vpsInstanceId) claims.vpsInstanceId = license.vpsInstanceId;
  }
  if (subscription) claims.subscriptionId = subscription.id;
  return claims;
}
