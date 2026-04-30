/**
 * Resolve authenticated context for the chat assistant.
 *
 * Reads HttpOnly session cookie from the incoming chat request, fetches
 * the user record, and (if available) the live trading state — floating
 * P&L, open positions, kill-switch status — so the AI can address the
 * user by name and reference real account state.
 *
 * Returns undefined kalau:
 *   - User tidak login (no session cookie atau expired)
 *   - Session valid tapi user tidak punya tenant/subscription (anonymous mode)
 *   - Backend trading-forex unreachable (graceful — AI fallback ke anonymous)
 */

import { jwtVerify, type JWTPayload } from 'jose';
import { prisma } from '@/lib/db/prisma';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { createLogger } from '@/lib/logger';
import type { AuthenticatedContext } from '@/lib/chat/skills/authenticated';

const log = createLogger('chat/auth-context');

interface SessionPayload extends JWTPayload {
  sub?: string;
  email?: string;
  role?: string;
}

async function readSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const cookieHeader = request.headers.get('cookie') ?? '';
  const tokenMatch = cookieHeader.match(/(?:^|;\s*)(?:access_token|session)=([^;]+)/);
  if (!tokenMatch) return null;
  const token = decodeURIComponent(tokenMatch[1]);
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as SessionPayload;
  } catch {
    return null;
  }
}

interface PositionRow {
  status?: string;
  unrealized_pnl_quote?: number | string;
  net_pnl_quote?: number | string;
}

async function fetchTradingState(): Promise<Pick<AuthenticatedContext, 'killSwitchActive' | 'floatingPnlUsd' | 'openPositions'>> {
  // Default fallback kalau backend unreachable
  const fallback = { killSwitchActive: false, floatingPnlUsd: null, openPositions: 0 };

  try {
    const posRes = await proxyToMasterBackend('tenant', '/api/forex/positions?status=open&limit=200', { method: 'GET' });
    if (!posRes.ok) return fallback;
    const posBody = await posRes.json();
    const rows: PositionRow[] = Array.isArray(posBody.data) ? posBody.data : Array.isArray(posBody) ? posBody : [];
    const openPositions = rows.length;
    const floatingPnlUsd = rows.reduce((sum, r) => {
      const v = typeof r.unrealized_pnl_quote === 'number'
        ? r.unrealized_pnl_quote
        : parseFloat(String(r.unrealized_pnl_quote ?? 0));
      return sum + (Number.isFinite(v) ? v : 0);
    }, 0);

    let killSwitchActive = false;
    try {
      const ksRes = await proxyToMasterBackend('tenant', '/api/forex/me/kill-switch/status', { method: 'GET' });
      if (ksRes.ok) {
        const ksBody = await ksRes.json();
        killSwitchActive = Boolean(ksBody.is_active);
      }
    } catch {
      // kill-switch endpoint may 404 for non-tenant users
    }

    return { killSwitchActive, floatingPnlUsd, openPositions };
  } catch (err) {
    log.warn(`fetchTradingState failed: ${err instanceof Error ? err.message : 'unknown'}`);
    return fallback;
  }
}

export async function resolveAuthenticatedContext(request: Request): Promise<AuthenticatedContext | undefined> {
  const session = await readSessionFromRequest(request);
  if (!session?.sub) return undefined;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      subscriptions: {
        where: { status: 'ACTIVE' },
        select: { tier: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  }).catch(() => null);

  if (!user) return undefined;

  const tier = user.subscriptions[0]?.tier ?? null;
  const tradingState = await fetchTradingState();

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tier,
    ...tradingState,
  };
}
