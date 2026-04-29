export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { proxyToMasterBackend } from '@/lib/proxy/vps-client';
import { prisma } from '@/lib/db/prisma';
import { requireSignalEligible } from '@/lib/auth/client-eligibility';
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
  const gate = await requireSignalEligible(request);
  if (!gate.ok) return gate.response;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'Signal ID required' }, { status: 400 });

  // Try master backend (`/v1/signals/{uuid}` per backend signals_api router)
  try {
    const res = await proxyToMasterBackend('signals', `/v1/signals/${encodeURIComponent(id)}`, { method: 'GET' });
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
