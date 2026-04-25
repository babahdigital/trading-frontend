export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { prisma } from '@/lib/db/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('api/client/signals/detail');

/**
 * Single signal detail. Same eligibility check as list endpoint.
 * Tries master backend first, falls back to local SignalAuditLog.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = request.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Signal ID required' }, { status: 400 });

  // Eligibility check (mirror of list endpoint)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscriptions: { where: { status: 'ACTIVE' }, take: 1 },
      licenses: { where: { status: 'ACTIVE' }, take: 1 },
    },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const role = request.headers.get('x-user-role');
  const tierOk = role === 'ADMIN'
    || /^SIGNAL_|^PAMM_/i.test(user.subscriptions[0]?.tier ?? '')
    || ['VPS_INSTALLATION', 'SIGNAL_SUBSCRIBER'].includes(user.licenses[0]?.type ?? '');

  if (!tierOk) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  // Try master backend
  try {
    const res = await proxyToMasterBackend('signals', `/api/signals/${encodeURIComponent(id)}`, { method: 'GET' });
    if (res.ok) {
      const body = await res.json();
      return NextResponse.json({ source: 'backend', signal: body.signal ?? body });
    }
    if (res.status === 404) {
      return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    }
    log.warn(`Signal detail backend HTTP ${res.status}`);
  } catch (err) {
    log.warn(`Signal detail backend error: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  // Fallback: local SignalAuditLog by sourceId
  try {
    const numericId = BigInt(id);
    const signal = await prisma.signalAuditLog.findUnique({
      where: { sourceId: numericId },
    });
    if (!signal) return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
    return NextResponse.json({
      source: 'local-fallback',
      signal: { ...signal, sourceId: signal.sourceId.toString() },
    });
  } catch {
    return NextResponse.json({ error: 'Signal not found' }, { status: 404 });
  }
}
